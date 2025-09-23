package expo.modules.iap

import android.util.Log
import dev.hyo.openiap.AndroidSubscriptionOfferInput
import dev.hyo.openiap.OpenIapModule
import dev.hyo.openiap.ProductQueryType
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.concurrent.ConcurrentLinkedQueue

object ExpoIapHelper {
    private const val TAG = "ExpoIapHelper"
    private const val MAX_BUFFERED_EVENTS = 200

    fun emitOrQueue(
        module: Module,
        scope: CoroutineScope,
        connectionReady: java.util.concurrent.atomic.AtomicBoolean,
        pendingEvents: ConcurrentLinkedQueue<Pair<String, Map<String, Any?>>>,
        name: String,
        payload: Map<String, Any?>,
    ) {
        if (connectionReady.get()) {
            // Ensure event emission occurs on the main dispatcher
            scope.launch { module.sendEvent(name, payload) }
            return
        }
        // Bound the buffer to prevent unbounded growth if init stalls
        if (pendingEvents.size >= MAX_BUFFERED_EVENTS) {
            pendingEvents.poll()
            ExpoIapLog.warning("pendingEvents overflow; dropping oldest")
        }
        pendingEvents.add(name to payload)
    }

    fun parseProductQueryType(rawType: String?): ProductQueryType {
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

    fun parseRequestPurchaseParams(params: Map<String, Any?>): RequestPurchaseParams {
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

        return RequestPurchaseParams(
            type = type,
            skus = skus,
            obfuscatedAccountId = obfuscatedAccountId,
            obfuscatedProfileId = obfuscatedProfileId,
            isOfferPersonalized = isOfferPersonalized,
            offerTokenArr = offerTokenArr,
            explicitSubscriptionOffers = explicitSubscriptionOffers,
            purchaseToken = purchaseToken,
            replacementMode = replacementMode,
        )
    }

    data class RequestPurchaseParams(
        val type: String?,
        val skus: List<String>,
        val obfuscatedAccountId: String?,
        val obfuscatedProfileId: String?,
        val isOfferPersonalized: Boolean,
        val offerTokenArr: List<String>,
        val explicitSubscriptionOffers: List<AndroidSubscriptionOfferInput>,
        val purchaseToken: String?,
        val replacementMode: Number?,
    )

    fun addPurchasePromise(promise: Promise) {
        PromiseUtils.addPromiseForKey(PromiseUtils.PROMISE_BUY_ITEM, promise)
    }

    fun resolvePurchasePromises(purchases: List<Map<String, Any?>>) {
        PromiseUtils.resolvePromisesForKey(
            PromiseUtils.PROMISE_BUY_ITEM,
            purchases,
        )
    }

    fun rejectPurchasePromises(
        code: String,
        message: String?,
        error: Exception?,
    ) {
        PromiseUtils.rejectPromisesForKey(
            PromiseUtils.PROMISE_BUY_ITEM,
            code,
            message,
            error,
        )
    }

    fun setupListeners(
        openIap: OpenIapModule,
        module: Module,
        scope: CoroutineScope,
        connectionReady: java.util.concurrent.atomic.AtomicBoolean,
        pendingEvents: ConcurrentLinkedQueue<Pair<String, Map<String, Any?>>>,
        eventPurchaseUpdated: String,
        eventPurchaseError: String,
    ) {
        openIap.addPurchaseUpdateListener { p ->
            runCatching {
                emitOrQueue(
                    module,
                    scope,
                    connectionReady,
                    pendingEvents,
                    eventPurchaseUpdated,
                    p.toJson(),
                )
            }.onFailure { android.util.Log.e(TAG, "Failed to buffer/send PURCHASE_UPDATED", it) }
        }
        openIap.addPurchaseErrorListener { e ->
            runCatching {
                emitOrQueue(
                    module,
                    scope,
                    connectionReady,
                    pendingEvents,
                    eventPurchaseError,
                    e.toJSON(),
                )
            }.onFailure { android.util.Log.e(TAG, "Failed to buffer/send PURCHASE_ERROR", it) }
        }
    }

    fun cleanupListeners(openIap: OpenIapModule) {
        // Android doesn't have explicit listeners to clean up
        // This function is kept for API compatibility with iOS
    }
}
