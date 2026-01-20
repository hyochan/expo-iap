package expo.modules.iap

import android.util.Log
import dev.hyo.openiap.AndroidSubscriptionOfferInput
import dev.hyo.openiap.OpenIapModule
import dev.hyo.openiap.ProductQueryType
import dev.hyo.openiap.SubscriptionProductReplacementParamsAndroid
import dev.hyo.openiap.SubscriptionReplacementModeAndroid
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
        val obfuscatedAccountId = params["obfuscatedAccountId"] as? String
        val obfuscatedProfileId = params["obfuscatedProfileId"] as? String
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
        val purchaseToken = params["purchaseToken"] as? String
        val replacementMode = params["replacementMode"] as? Number
        val subscriptionProductReplacementParams =
            (params["subscriptionProductReplacementParams"] as? Map<*, *>)?.let { paramsMap ->
                val oldProductId = paramsMap["oldProductId"] as? String
                val replacementModeStr = paramsMap["replacementMode"] as? String
                if (oldProductId.isNullOrEmpty() || replacementModeStr.isNullOrEmpty()) {
                    null
                } else {
                    SubscriptionProductReplacementParamsAndroid(
                        oldProductId = oldProductId,
                        replacementMode = parseSubscriptionReplacementMode(replacementModeStr),
                    )
                }
            }
        // offerToken for one-time purchase discounts (Android 7.0+)
        val offerToken = params["offerToken"] as? String

        return RequestPurchaseParams(
            type = type,
            skus = skus,
            obfuscatedAccountId = obfuscatedAccountId,
            obfuscatedProfileId = obfuscatedProfileId,
            isOfferPersonalized = isOfferPersonalized,
            offerToken = offerToken,
            offerTokenArr = offerTokenArr,
            explicitSubscriptionOffers = explicitSubscriptionOffers,
            purchaseToken = purchaseToken,
            replacementMode = replacementMode,
            subscriptionProductReplacementParams = subscriptionProductReplacementParams,
        )
    }

    fun parseSubscriptionReplacementMode(mode: String): SubscriptionReplacementModeAndroid =
        when (mode) {
            "with-time-proration" -> SubscriptionReplacementModeAndroid.WithTimeProration
            "charge-prorated-price" -> SubscriptionReplacementModeAndroid.ChargeProratedPrice
            "charge-full-price" -> SubscriptionReplacementModeAndroid.ChargeFullPrice
            "without-proration" -> SubscriptionReplacementModeAndroid.WithoutProration
            "deferred" -> SubscriptionReplacementModeAndroid.Deferred
            "keep-existing" -> SubscriptionReplacementModeAndroid.KeepExisting
            else -> SubscriptionReplacementModeAndroid.UnknownReplacementMode
        }

    data class RequestPurchaseParams(
        val type: String?,
        val skus: List<String>,
        val obfuscatedAccountId: String?,
        val obfuscatedProfileId: String?,
        val isOfferPersonalized: Boolean,
        /** Offer token for one-time purchase discounts (Android 7.0+) */
        val offerToken: String?,
        val offerTokenArr: List<String>,
        val explicitSubscriptionOffers: List<AndroidSubscriptionOfferInput>,
        val purchaseToken: String?,
        val replacementMode: Number?,
        val subscriptionProductReplacementParams: SubscriptionProductReplacementParamsAndroid?,
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

    /**
     * Helper to safely emit an event with error fallback.
     * Reduces code duplication across listener handlers.
     */
    private fun safeEmitEvent(
        module: Module,
        scope: CoroutineScope,
        connectionReady: java.util.concurrent.atomic.AtomicBoolean,
        pendingEvents: ConcurrentLinkedQueue<Pair<String, Map<String, Any?>>>,
        eventName: String,
        payload: Map<String, Any?>,
        eventPurchaseError: String,
        fallbackErrorCode: String,
        fallbackErrorPrefix: String,
        logTag: String,
    ) {
        runCatching {
            emitOrQueue(module, scope, connectionReady, pendingEvents, eventName, payload)
        }.onFailure { error ->
            android.util.Log.e(TAG, "Failed to buffer/send $logTag", error)
            val errorPayload =
                mapOf(
                    "code" to fallbackErrorCode,
                    "message" to "$fallbackErrorPrefix: ${error.message}",
                )
            runCatching {
                emitOrQueue(module, scope, connectionReady, pendingEvents, eventPurchaseError, errorPayload)
            }.onFailure { android.util.Log.e(TAG, "Failed to send error event", it) }
        }
    }

    fun setupListeners(
        openIap: OpenIapModule,
        module: Module,
        scope: CoroutineScope,
        connectionReady: java.util.concurrent.atomic.AtomicBoolean,
        pendingEvents: ConcurrentLinkedQueue<Pair<String, Map<String, Any?>>>,
        eventPurchaseUpdated: String,
        eventPurchaseError: String,
        eventUserChoiceBilling: String,
        eventDeveloperProvidedBilling: String,
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
            }.onFailure { error ->
                android.util.Log.e(TAG, "Failed to buffer/send PURCHASE_UPDATED", error)
                // Emit as purchase error so user knows something went wrong
                val errorPayload =
                    mapOf(
                        "code" to "purchase-error",
                        "message" to "Failed to process purchase update: ${error.message}",
                    )
                runCatching {
                    emitOrQueue(
                        module,
                        scope,
                        connectionReady,
                        pendingEvents,
                        eventPurchaseError,
                        errorPayload,
                    )
                }.onFailure { android.util.Log.e(TAG, "Failed to send error event", it) }
            }
        }
        openIap.addPurchaseErrorListener { e ->
            val errorJson = e.toJSON()
            runCatching {
                emitOrQueue(
                    module,
                    scope,
                    connectionReady,
                    pendingEvents,
                    eventPurchaseError,
                    errorJson,
                )
            }.onFailure { error ->
                android.util.Log.e(TAG, "Failed to buffer/send PURCHASE_ERROR", error)
                // Critical: if we can't emit the original error, at least try to emit a generic one
                val fallbackPayload =
                    mapOf(
                        "code" to "unknown",
                        "message" to "Failed to emit purchase error: ${error.message}",
                    )
                runCatching {
                    emitOrQueue(
                        module,
                        scope,
                        connectionReady,
                        pendingEvents,
                        eventPurchaseError,
                        fallbackPayload,
                    )
                }.onFailure { android.util.Log.e(TAG, "Failed to send fallback error event", it) }
            }
            // Also reject any pending purchase promises to match iOS behavior
            val errorCode = errorJson["code"] as? String ?: "purchase-error"
            val errorMessage = errorJson["message"] as? String ?: "Purchase failed"
            rejectPurchasePromises(errorCode, errorMessage, null)
        }
        openIap.addUserChoiceBillingListener { details ->
            safeEmitEvent(
                module,
                scope,
                connectionReady,
                pendingEvents,
                eventUserChoiceBilling,
                details.toJson(),
                eventPurchaseError,
                "alternative-billing-not-available",
                "Failed to process user choice billing",
                "USER_CHOICE_BILLING",
            )
        }
        // Developer Provided Billing listener for External Payments (8.3.0+)
        openIap.addDeveloperProvidedBillingListener { details ->
            safeEmitEvent(
                module,
                scope,
                connectionReady,
                pendingEvents,
                eventDeveloperProvidedBilling,
                details.toJson(),
                eventPurchaseError,
                "developer-billing-error",
                "Failed to process developer provided billing",
                "DEVELOPER_PROVIDED_BILLING",
            )
        }
    }

    fun cleanupListeners(openIap: OpenIapModule) {
        // Android doesn't have explicit listeners to clean up
        // This function is kept for API compatibility with iOS
    }
}
