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

class ExpoIapModule : Module() {
    companion object {
        const val TAG = "ExpoIapModule"
        private const val EVENT_PURCHASE_UPDATED = "purchase-updated"
        private const val EVENT_PURCHASE_ERROR = "purchase-error"
    }

    private val job = Job()
    private val scope = CoroutineScope(Dispatchers.Main + job)
    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    private val currentActivity
        get() = appContext.activityProvider?.currentActivity ?: throw Exceptions.MissingActivity()

    private val openIap: OpenIapModule by lazy { OpenIapModule(context) }
    private var listenersAttached = false

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
                    try {
                        runCatching { openIap.setActivity(currentActivity) }
                        if (!listenersAttached) {
                            listenersAttached = true
                            openIap.addPurchaseUpdateListener { p ->
                                try {
                                    sendEvent(EVENT_PURCHASE_UPDATED, p.toJSON())
                                } catch (ex: Exception) {
                                    Log.e(TAG, "Failed to send PURCHASE_UPDATED event", ex)
                                }
                            }
                            openIap.addPurchaseErrorListener { e ->
                                try {
                                    sendEvent(EVENT_PURCHASE_ERROR, e.toJSON())
                                } catch (ex: Exception) {
                                    Log.e(TAG, "Failed to send PURCHASE_ERROR event", ex)
                                }
                            }
                        }
                        val ok = openIap.initConnection()
                        promise.resolve(ok)
                    } catch (e: Exception) {
                        promise.reject(OpenIapError.E_INIT_CONNECTION, e.message, null)
                    }
                }
            }

            AsyncFunction("endConnection") { promise: Promise ->
                scope.launch {
                    runCatching { openIap.endConnection() }
                    promise.resolve(true)
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

            AsyncFunction("requestProducts") { type: String, skuArr: Array<String>, promise: Promise ->
                Log.w(TAG, "WARNING: requestProducts is deprecated. Use fetchProducts instead.")
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

            // Unified available items API (align with iOS)
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

            // Back-compat: keep old name but ignore type and warn
            AsyncFunction("getAvailableItemsByType") { _: String, promise: Promise ->
                Log.w(TAG, "getAvailableItemsByType is deprecated. Use getAvailableItems().")
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
                    } catch (_: Exception) {
                        // Follow OpenIAP behavior: resolve empty string on failure
                        promise.resolve("")
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
                        runCatching { openIap.setActivity(currentActivity) }
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
                                sendEvent(EVENT_PURCHASE_UPDATED, p.toJSON())
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
                            sendEvent(EVENT_PURCHASE_ERROR, errorMap)
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
                        promise.resolve(mapOf("responseCode" to 0, "purchaseTokenAndroid" to token))
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
