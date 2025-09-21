package expo.modules.iap

import android.content.Context
import android.util.Log
import dev.hyo.openiap.AndroidSubscriptionOfferInput
import dev.hyo.openiap.DeepLinkOptions
import dev.hyo.openiap.FetchProductsResultProducts
import dev.hyo.openiap.FetchProductsResultSubscriptions
import dev.hyo.openiap.OpenIapError
import dev.hyo.openiap.OpenIapModule
import dev.hyo.openiap.ProductQueryType
import dev.hyo.openiap.ProductRequest
import dev.hyo.openiap.Purchase
import dev.hyo.openiap.RequestPurchaseAndroidProps
import dev.hyo.openiap.RequestPurchaseProps
import dev.hyo.openiap.RequestPurchasePropsByPlatforms
import dev.hyo.openiap.RequestPurchaseResultPurchase
import dev.hyo.openiap.RequestPurchaseResultPurchases
import dev.hyo.openiap.RequestSubscriptionAndroidProps
import dev.hyo.openiap.RequestSubscriptionPropsByPlatforms
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.Locale
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class ExpoIapModule : Module() {
    companion object {
        const val TAG = "ExpoIapModule"
        private const val EVENT_PURCHASE_UPDATED = "purchase-updated"
        private const val EVENT_PURCHASE_ERROR = "purchase-error"
        private const val MAX_BUFFERED_EVENTS = 200
    }

    private val job = Job()
    private val scope = CoroutineScope(Dispatchers.Main + job)
    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    private val currentActivity
        get() = appContext.activityProvider?.currentActivity ?: throw Exceptions.MissingActivity()

    private val openIap: OpenIapModule by lazy { OpenIapModule(context) }
    private var listenersAttached = false
    private val pendingEvents = ConcurrentLinkedQueue<Pair<String, Map<String, Any?>>>()
    private val connectionReady = AtomicBoolean(false)
    private val connectionMutex = Mutex()

    private fun emitOrQueue(
        name: String,
        payload: Map<String, Any?>,
    ) {
        if (connectionReady.get()) {
            // Ensure event emission occurs on the main dispatcher
            scope.launch { sendEvent(name, payload) }
            return
        }
        // Bound the buffer to prevent unbounded growth if init stalls
        if (pendingEvents.size >= MAX_BUFFERED_EVENTS) {
            pendingEvents.poll()
            Log.w(TAG, "pendingEvents overflow; dropping oldest")
        }
        pendingEvents.add(name to payload)
    }

    private fun parseProductQueryType(rawType: String?): ProductQueryType {
        val normalized =
            rawType
                ?.trim()
                ?.lowercase(Locale.US)
                ?.replace("-", "")
                ?.replace("_", "")

        return when (normalized) {
            "subs" -> ProductQueryType.Subs
            "all" -> ProductQueryType.All
            else -> ProductQueryType.InApp
        }
    }

    override fun definition() =
        ModuleDefinition {
            Name("ExpoIap")

            Constants(
                "ERROR_CODES" to OpenIapError.getAllErrorCodes(),
            )

            Events(EVENT_PURCHASE_UPDATED, EVENT_PURCHASE_ERROR)

            AsyncFunction("initConnection") { promise: Promise ->
                ExpoIapLog.payload("initConnection", null)
                scope.launch {
                    connectionMutex.withLock {
                        try {
                            // Activity may be unavailable in headless/background scenarios.
                            // Attempt to set it, but do not fail init if missing.
                            runCatching { openIap.setActivity(currentActivity) }
                                .onFailure { Log.w(TAG, "initConnection: Activity missing; proceeding headless", it) }

                            // If already connected, short-circuit
                            if (connectionReady.get()) {
                                ExpoIapLog.result("initConnection", true)
                                promise.resolve(true)
                                return@withLock
                            }

                            // Attach listeners early to avoid races during init
                            if (!listenersAttached) {
                                listenersAttached = true
                                openIap.addPurchaseUpdateListener { p ->
                                    runCatching {
                                        emitOrQueue(EVENT_PURCHASE_UPDATED, p.toJson())
                                    }.onFailure { Log.e(TAG, "Failed to buffer/send PURCHASE_UPDATED", it) }
                                }
                                openIap.addPurchaseErrorListener { e ->
                                    runCatching { emitOrQueue(EVENT_PURCHASE_ERROR, e.toJSON()) }
                                        .onFailure { Log.e(TAG, "Failed to buffer/send PURCHASE_ERROR", it) }
                                }
                            }

                            val ok = openIap.initConnection()

                            if (!ok) {
                                // Clear any buffered events from a failed init
                                pendingEvents.clear()
                                ExpoIapLog.failure(
                                    "initConnection",
                                    IllegalStateException("Failed to initialize connection"),
                                )
                                promise.reject(OpenIapError.InitConnection.CODE, "Failed to initialize connection", null)
                                return@withLock
                            }

                            // Mark ready then flush any buffered events
                            connectionReady.set(true)
                            while (true) {
                                val ev = pendingEvents.poll() ?: break
                                // Already on main dispatcher here; emit directly
                                runCatching { sendEvent(ev.first, ev.second) }
                                    .onFailure { Log.e(TAG, "Failed to flush buffered event: ${ev.first}", it) }
                            }

                            ExpoIapLog.result("initConnection", true)
                            promise.resolve(true)
                        } catch (e: Exception) {
                            ExpoIapLog.failure("initConnection", e)
                            promise.reject(OpenIapError.InitConnection.CODE, e.message, e)
                        }
                    }
                }
            }

            AsyncFunction("endConnection") { promise: Promise ->
                ExpoIapLog.payload("endConnection", null)
                scope.launch {
                    connectionMutex.withLock {
                        runCatching { openIap.endConnection() }
                        // Reset connection state and clear any buffered events
                        connectionReady.set(false)
                        pendingEvents.clear()
                        ExpoIapLog.result("endConnection", true)
                        promise.resolve(true)
                    }
                }
            }

            AsyncFunction("fetchProducts") { type: String, skuArr: Array<String>, promise: Promise ->
                ExpoIapLog.payload(
                    "fetchProductsAndroid",
                    mapOf("type" to type, "skus" to skuArr.toList()),
                )
                scope.launch {
                    try {
                        val queryType = parseProductQueryType(type)
                        val request = ProductRequest(skuArr.toList(), queryType)
                        val result = openIap.fetchProducts(request)
                        val payload =
                            when (result) {
                                is FetchProductsResultProducts -> result.value.orEmpty().map { it.toJson() }
                                is FetchProductsResultSubscriptions -> result.value.orEmpty().map { it.toJson() }
                                else -> emptyList<Map<String, Any?>>()
                            }
                        ExpoIapLog.result("fetchProductsAndroid", payload)
                        promise.resolve(payload)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("fetchProductsAndroid", e)
                        promise.reject(OpenIapError.QueryProduct.CODE, e.message, null)
                    }
                }
            }

            AsyncFunction("getAvailableItems") { promise: Promise ->
                ExpoIapLog.payload("getAvailableItemsAndroid", null)
                scope.launch {
                    try {
                        val purchases = openIap.getAvailablePurchases(null)
                        val payload = purchases.map { it.toJson() }
                        ExpoIapLog.result("getAvailableItemsAndroid", payload)
                        promise.resolve(payload)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("getAvailableItemsAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            // Deep link to Manage Subscriptions screen (Android)
            AsyncFunction("deepLinkToSubscriptionsAndroid") { params: Map<String, Any?>, promise: Promise ->
                val sku = (params["sku"] ?: params["skuAndroid"]) as? String
                val packageName = (params["packageName"] ?: params["packageNameAndroid"]) as? String
                ExpoIapLog.payload(
                    "deepLinkToSubscriptionsAndroid",
                    mapOf("sku" to sku, "packageName" to packageName),
                )
                scope.launch {
                    try {
                        openIap.deepLinkToSubscriptions(
                            DeepLinkOptions(
                                packageNameAndroid = packageName,
                                skuAndroid = sku,
                            ),
                        )
                        ExpoIapLog.result("deepLinkToSubscriptionsAndroid", true)
                        promise.resolve(null)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("deepLinkToSubscriptionsAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            // Get Google Play storefront country code (Android)
            AsyncFunction("getStorefrontAndroid") { promise: Promise ->
                ExpoIapLog.payload("getStorefrontAndroid", null)
                scope.launch {
                    try {
                        val code = openIap.getStorefront()
                        ExpoIapLog.result("getStorefrontAndroid", code)
                        promise.resolve(code)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("getStorefrontAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, e)
                    }
                }
            }

            AsyncFunction("requestPurchase") { params: Map<String, Any?>, promise: Promise ->
                ExpoIapLog.payload("requestPurchaseAndroid", params)
                val type = params["type"] as? String
                val skus: List<String> =
                    (params["skus"] as? List<*>)?.filterIsInstance<String>()
                        ?: (params["skuArr"] as? List<*>)?.filterIsInstance<String>()
                        ?: emptyList()
                val obfuscatedAccountId =
                    (params["obfuscatedAccountIdAndroid"] ?: params["obfuscatedAccountId"]) as? String
                val obfuscatedProfileId =
                    (params["obfuscatedProfileIdAndroid"] ?: params["obfuscatedProfileId"]) as? String
                val isOfferPersonalized = params["isOfferPersonalized"] as? Boolean ?: false
                val offerTokenArr =
                    (params["offerTokenArr"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
                val explicitSubscriptionOffers =
                    (params["subscriptionOffers"] as? List<*>)?.mapNotNull { rawOffer ->
                        val offerMap = rawOffer as? Map<*, *> ?: return@mapNotNull null
                        val sku = offerMap["sku"] as? String
                        val offerToken = offerMap["offerToken"] as? String
                        if (sku.isNullOrEmpty() || offerToken.isNullOrEmpty()) {
                            null
                        } else {
                            AndroidSubscriptionOfferInput(offerToken = offerToken, sku = sku)
                        }
                    } ?: emptyList()
                val purchaseToken =
                    (params["purchaseTokenAndroid"] ?: params["purchaseToken"]) as? String
                val replacementMode =
                    (params["replacementModeAndroid"] ?: params["replacementMode"]) as? Number

                val productType =
                    when (parseProductQueryType(type)) {
                        ProductQueryType.Subs -> ProductQueryType.Subs
                        else -> ProductQueryType.InApp
                    }

                val fallbackOffers =
                    if (explicitSubscriptionOffers.isEmpty() && offerTokenArr.isNotEmpty()) {
                        skus.zip(offerTokenArr).mapNotNull { (sku, token) ->
                            if (token.isNotEmpty()) {
                                AndroidSubscriptionOfferInput(offerToken = token, sku = sku)
                            } else {
                                null
                            }
                        }
                    } else {
                        emptyList()
                    }

                val subscriptionOffers =
                    (explicitSubscriptionOffers.ifEmpty { fallbackOffers })
                        .takeIf { it.isNotEmpty() }

                val requestProps =
                    when (productType) {
                        ProductQueryType.Subs -> {
                            val android =
                                RequestSubscriptionAndroidProps(
                                    isOfferPersonalized = isOfferPersonalized,
                                    obfuscatedAccountIdAndroid = obfuscatedAccountId,
                                    obfuscatedProfileIdAndroid = obfuscatedProfileId,
                                    purchaseTokenAndroid = purchaseToken,
                                    replacementModeAndroid = replacementMode?.toInt(),
                                    skus = skus,
                                    subscriptionOffers = subscriptionOffers,
                                )
                            RequestPurchaseProps(
                                request =
                                    RequestPurchaseProps.Request.Subscription(
                                        RequestSubscriptionPropsByPlatforms(android = android),
                                    ),
                                type = ProductQueryType.Subs,
                            )
                        }

                        else -> {
                            val android =
                                RequestPurchaseAndroidProps(
                                    isOfferPersonalized = isOfferPersonalized,
                                    obfuscatedAccountIdAndroid = obfuscatedAccountId,
                                    obfuscatedProfileIdAndroid = obfuscatedProfileId,
                                    skus = skus,
                                )
                            RequestPurchaseProps(
                                request =
                                    RequestPurchaseProps.Request.Purchase(
                                        RequestPurchasePropsByPlatforms(android = android),
                                    ),
                                type = ProductQueryType.InApp,
                            )
                        }
                    }

                PromiseUtils.addPromiseForKey(PromiseUtils.PROMISE_BUY_ITEM, promise)
                scope.launch {
                    try {
                        openIap.setActivity(currentActivity)
                        val result = openIap.requestPurchase(requestProps)
                        val purchases =
                            when (result) {
                                is RequestPurchaseResultPurchases -> result.value.orEmpty()
                                is RequestPurchaseResultPurchase -> result.value?.let(::listOf).orEmpty()
                                else -> emptyList()
                            }
                        ExpoIapLog.result(
                            "requestPurchaseAndroid",
                            purchases.map { it.toJson() },
                        )
                        purchases.forEach { purchase ->
                            runCatching {
                                emitOrQueue(EVENT_PURCHASE_UPDATED, purchase.toJson())
                            }.onFailure { ex ->
                                Log.e(
                                    TAG,
                                    "Failed to send PURCHASE_UPDATED event (requestPurchase)",
                                    ex,
                                )
                            }
                        }
                        PromiseUtils.resolvePromisesForKey(
                            PromiseUtils.PROMISE_BUY_ITEM,
                            purchases.map { it.toJson() },
                        )
                    } catch (e: Exception) {
                        ExpoIapLog.failure("requestPurchaseAndroid", e)
                        val errorMap =
                            mapOf(
                                "code" to OpenIapError.PurchaseFailed.CODE,
                                "message" to (e.message ?: "Purchase failed"),
                                "platform" to "android",
                            )
                        runCatching { emitOrQueue(EVENT_PURCHASE_ERROR, errorMap) }
                            .onFailure { ex ->
                                Log.e(
                                    TAG,
                                    "Failed to send PURCHASE_ERROR event (requestPurchase)",
                                    ex,
                                )
                            }
                        PromiseUtils.rejectPromisesForKey(
                            PromiseUtils.PROMISE_BUY_ITEM,
                            OpenIapError.PurchaseFailed.CODE,
                            e.message,
                            null,
                        )
                    }
                }
            }

            AsyncFunction("acknowledgePurchaseAndroid") { token: String, promise: Promise ->
                ExpoIapLog.payload("acknowledgePurchaseAndroid", mapOf("token" to token))
                scope.launch {
                    try {
                        openIap.acknowledgePurchaseAndroid(token)
                        val response = mapOf("responseCode" to 0)
                        ExpoIapLog.result("acknowledgePurchaseAndroid", response)
                        promise.resolve(response)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("acknowledgePurchaseAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            // New name: consumePurchaseAndroid
            AsyncFunction("consumePurchaseAndroid") { token: String, promise: Promise ->
                ExpoIapLog.payload("consumePurchaseAndroid", mapOf("token" to token))
                scope.launch {
                    try {
                        openIap.consumePurchaseAndroid(token)
                        val response = mapOf("responseCode" to 0, "purchaseToken" to token)
                        ExpoIapLog.result("consumePurchaseAndroid", response)
                        promise.resolve(response)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("consumePurchaseAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            OnDestroy {
                job.cancel()
            }
        }
}
