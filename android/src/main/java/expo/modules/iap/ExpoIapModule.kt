package expo.modules.iap

import android.content.Context
import android.util.Log
import dev.hyo.openiap.OpenIapError
import dev.hyo.openiap.OpenIapModule
import dev.hyo.openiap.models.DeepLinkOptions
import dev.hyo.openiap.models.ProductRequest
import dev.hyo.openiap.models.RequestPurchaseAndroidProps
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

    // Mapping helpers now provided by openiap-google (toJSON helpers)

    override fun definition() =
        ModuleDefinition {
            Name("ExpoIap")

            Constants(
                "ERROR_CODES" to OpenIapError.getAllErrorCodes(),
            )

            Events(EVENT_PURCHASE_UPDATED, EVENT_PURCHASE_ERROR)

            AsyncFunction("initConnection") { promise: Promise ->
                scope.launch {
                    connectionMutex.withLock {
                        try {
                            // Activity may be unavailable in headless/background scenarios.
                            // Attempt to set it, but do not fail init if missing.
                            runCatching { openIap.setActivity(currentActivity) }
                                .onFailure { Log.w(TAG, "initConnection: Activity missing; proceeding headless", it) }

                            // If already connected, short-circuit
                            if (connectionReady.get()) {
                                promise.resolve(true)
                                return@withLock
                            }

                            // Attach listeners early to avoid races during init
                            if (!listenersAttached) {
                                listenersAttached = true
                                openIap.addPurchaseUpdateListener { p ->
                                    runCatching { emitOrQueue(EVENT_PURCHASE_UPDATED, p.toJSON()) }
                                        .onFailure { Log.e(TAG, "Failed to buffer/send PURCHASE_UPDATED", it) }
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
                                promise.reject(OpenIapError.E_INIT_CONNECTION, "Failed to initialize connection", null)
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

                            promise.resolve(true)
                        } catch (e: Exception) {
                            promise.reject(OpenIapError.E_INIT_CONNECTION, e.message, e)
                        }
                    }
                }
            }

            AsyncFunction("endConnection") { promise: Promise ->
                scope.launch {
                    connectionMutex.withLock {
                        runCatching { openIap.endConnection() }
                        // Reset connection state and clear any buffered events
                        connectionReady.set(false)
                        pendingEvents.clear()
                        promise.resolve(true)
                    }
                }
            }

            AsyncFunction("fetchProducts") { type: String, skuArr: Array<String>, promise: Promise ->
                scope.launch {
                    try {
                        val reqType = ProductRequest.ProductRequestType.fromString(type)
                        val products = openIap.fetchProducts(ProductRequest(skuArr.toList(), reqType))
                        promise.resolve(products.map { it.toJSON() })
                    } catch (e: Exception) {
                        promise.reject(OpenIapError.E_QUERY_PRODUCT, e.message, null)
                    }
                }
            }

            AsyncFunction("getAvailableItems") { promise: Promise ->
                scope.launch {
                    try {
                        val purchases = openIap.getAvailablePurchases(null)
                        promise.resolve(purchases.map { it.toJSON() })
                    } catch (e: Exception) {
                        promise.reject(OpenIapError.E_SERVICE_ERROR, e.message, null)
                    }
                }
            }

            // Deep link to Manage Subscriptions screen (Android)
            AsyncFunction("deepLinkToSubscriptionsAndroid") { params: Map<String, Any?>, promise: Promise ->
                val sku = (params["sku"] ?: params["skuAndroid"]) as? String
                val packageName = (params["packageName"] ?: params["packageNameAndroid"]) as? String
                scope.launch {
                    try {
                        openIap.deepLinkToSubscriptions(DeepLinkOptions(sku, packageName))
                        promise.resolve(null)
                    } catch (e: Exception) {
                        promise.reject(OpenIapError.E_SERVICE_ERROR, e.message, null)
                    }
                }
            }

            // Get Google Play storefront country code (Android)
            AsyncFunction("getStorefrontAndroid") { promise: Promise ->
                scope.launch {
                    try {
                        val code = openIap.getStorefront()
                        promise.resolve(code)
                    } catch (e: Exception) {
                        promise.reject(OpenIapError.E_SERVICE_ERROR, e.message, e)
                    }
                }
            }

            AsyncFunction("requestPurchase") { params: Map<String, Any?>, promise: Promise ->
                val type = params["type"] as String
                val skus: List<String> =
                    (params["skus"] as? List<*>)?.filterIsInstance<String>()
                        ?: (params["skuArr"] as? List<*>)?.filterIsInstance<String>()
                        ?: emptyList()
                val obfuscatedAccountId =
                    (params["obfuscatedAccountIdAndroid"] ?: params["obfuscatedAccountId"]) as? String
                val obfuscatedProfileId =
                    (params["obfuscatedProfileIdAndroid"] ?: params["obfuscatedProfileId"]) as? String
                val isOfferPersonalized = params["isOfferPersonalized"] as? Boolean ?: false

                PromiseUtils.addPromiseForKey(PromiseUtils.PROMISE_BUY_ITEM, promise)
                scope.launch {
                    try {
                        openIap.setActivity(currentActivity)
                        val reqType = ProductRequest.ProductRequestType.fromString(type)
                        val result =
                            openIap.requestPurchase(
                                RequestPurchaseAndroidProps(
                                    skus = skus,
                                    obfuscatedAccountIdAndroid = obfuscatedAccountId,
                                    obfuscatedProfileIdAndroid = obfuscatedProfileId,
                                    isOfferPersonalized = isOfferPersonalized,
                                ),
                                reqType,
                            )
                        result.forEach { p ->
                            try {
                                emitOrQueue(EVENT_PURCHASE_UPDATED, p.toJSON())
                            } catch (ex: Exception) {
                                Log.e(TAG, "Failed to send PURCHASE_UPDATED event (requestPurchase)", ex)
                            }
                        }
                        PromiseUtils.resolvePromisesForKey(PromiseUtils.PROMISE_BUY_ITEM, result.map { it.toJSON() })
                    } catch (e: Exception) {
                        val errorMap =
                            mapOf(
                                "code" to OpenIapError.E_PURCHASE_ERROR,
                                "message" to (e.message ?: "Purchase failed"),
                                "platform" to "android",
                            )
                        try {
                            emitOrQueue(EVENT_PURCHASE_ERROR, errorMap)
                        } catch (ex: Exception) {
                            Log.e(TAG, "Failed to send PURCHASE_ERROR event (requestPurchase)", ex)
                        }
                        // Reject and clear any pending promises for this purchase flow
                        PromiseUtils.rejectPromisesForKey(
                            PromiseUtils.PROMISE_BUY_ITEM,
                            OpenIapError.E_PURCHASE_ERROR,
                            e.message,
                            null,
                        )
                    }
                }
            }

            AsyncFunction("acknowledgePurchaseAndroid") { token: String, promise: Promise ->
                scope.launch {
                    try {
                        openIap.acknowledgePurchaseAndroid(token)
                        promise.resolve(mapOf("responseCode" to 0))
                    } catch (e: Exception) {
                        promise.reject(OpenIapError.E_SERVICE_ERROR, e.message, null)
                    }
                }
            }

            // New name: consumePurchaseAndroid
            AsyncFunction("consumePurchaseAndroid") { token: String, promise: Promise ->
                scope.launch {
                    try {
                        openIap.consumePurchaseAndroid(token)
                        promise.resolve(mapOf("responseCode" to 0, "purchaseToken" to token))
                    } catch (e: Exception) {
                        promise.reject(OpenIapError.E_SERVICE_ERROR, e.message, null)
                    }
                }
            }

            OnDestroy {
                job.cancel()
            }
        }
}
