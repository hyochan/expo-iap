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
                                ExpoIapHelper.setupListeners(
                                    openIap,
                                    this@ExpoIapModule,
                                    scope,
                                    connectionReady,
                                    pendingEvents,
                                    EVENT_PURCHASE_UPDATED,
                                    EVENT_PURCHASE_ERROR,
                                )
                            }

                            val ok = openIap.initConnection()

                            if (!ok) {
                                // Clear any buffered events from a failed init
                                pendingEvents.clear()
                                ExpoIapLog.failure("initConnection", IllegalStateException("Failed to initialize connection"))
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
                        ExpoIapHelper.cleanupListeners(openIap)
                        // Reset connection state and clear any buffered events
                        connectionReady.set(false)
                        pendingEvents.clear()
                        listenersAttached = false
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
                        val queryType = ExpoIapHelper.parseProductQueryType(type)
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
                ExpoIapLog.payload("deepLinkToSubscriptionsAndroid", mapOf("sku" to sku, "packageName" to packageName))
                scope.launch {
                    try {
                        openIap.deepLinkToSubscriptions(DeepLinkOptions(packageNameAndroid = packageName, skuAndroid = sku))
                        ExpoIapLog.result("deepLinkToSubscriptionsAndroid", true)
                        promise.resolve(null)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("deepLinkToSubscriptionsAndroid", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, null)
                    }
                }
            }

            // Get storefront country code (Android implementation)
            AsyncFunction("getStorefront") { promise: Promise ->
                ExpoIapLog.payload("getStorefront", null)
                scope.launch {
                    try {
                        val code = openIap.getStorefront()
                        ExpoIapLog.result("getStorefront", code)
                        promise.resolve(code)
                    } catch (e: Exception) {
                        ExpoIapLog.failure("getStorefront", e)
                        promise.reject(OpenIapError.ServiceUnavailable.CODE, e.message, e)
                    }
                }
            }

            AsyncFunction("requestPurchase") { params: Map<String, Any?>, promise: Promise ->
                ExpoIapLog.payload("requestPurchaseAndroid", params)
                val parsedParams = ExpoIapHelper.parseRequestPurchaseParams(params)

                val productType =
                    when (ExpoIapHelper.parseProductQueryType(parsedParams.type)) {
                        ProductQueryType.Subs -> ProductQueryType.Subs
                        else -> ProductQueryType.InApp
                    }

                val fallbackOffers =
                    if (parsedParams.explicitSubscriptionOffers.isEmpty() && parsedParams.offerTokenArr.isNotEmpty()) {
                        parsedParams.skus.zip(parsedParams.offerTokenArr).mapNotNull { (sku, token) ->
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
                    (parsedParams.explicitSubscriptionOffers.ifEmpty { fallbackOffers })
                        .takeIf { it.isNotEmpty() }

                val requestProps =
                    when (productType) {
                        ProductQueryType.Subs -> {
                            val android =
                                RequestSubscriptionAndroidProps(
                                    isOfferPersonalized = parsedParams.isOfferPersonalized,
                                    obfuscatedAccountIdAndroid = parsedParams.obfuscatedAccountId,
                                    obfuscatedProfileIdAndroid = parsedParams.obfuscatedProfileId,
                                    purchaseTokenAndroid = parsedParams.purchaseToken,
                                    replacementModeAndroid = parsedParams.replacementMode?.toInt(),
                                    skus = parsedParams.skus,
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
                                    isOfferPersonalized = parsedParams.isOfferPersonalized,
                                    obfuscatedAccountIdAndroid = parsedParams.obfuscatedAccountId,
                                    obfuscatedProfileIdAndroid = parsedParams.obfuscatedProfileId,
                                    skus = parsedParams.skus,
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

                ExpoIapHelper.addPurchasePromise(promise)
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
                        ExpoIapHelper.resolvePurchasePromises(purchases.map { it.toJson() })
                    } catch (e: Exception) {
                        ExpoIapLog.failure("requestPurchaseAndroid", e)
                        val errorMap =
                            mapOf(
                                "code" to OpenIapError.PurchaseFailed.CODE,
                                "message" to (e.message ?: "Purchase failed"),
                                "platform" to "android",
                            )
                        runCatching {
                            ExpoIapHelper.emitOrQueue(
                                this@ExpoIapModule,
                                scope,
                                connectionReady,
                                pendingEvents,
                                EVENT_PURCHASE_ERROR,
                                errorMap,
                            )
                        }.onFailure { ex ->
                            Log.e(
                                TAG,
                                "Failed to send PURCHASE_ERROR event (requestPurchase)",
                                ex,
                            )
                        }
                        ExpoIapHelper.rejectPurchasePromises(
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
                ExpoIapHelper.cleanupListeners(openIap)
                job.cancel()
            }
        }
}
