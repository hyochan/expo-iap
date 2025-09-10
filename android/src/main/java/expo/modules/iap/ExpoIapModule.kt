package expo.modules.iap

import android.content.Context
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingConfig
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingFlowParams.SubscriptionUpdateParams
import com.android.billingclient.api.BillingConfigResponseListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.GetBillingConfigParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.ProductDetailsResult
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryProductDetailsResult
import com.android.billingclient.api.QueryPurchasesParams
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoIapModule :
    Module(),
    PurchasesUpdatedListener {
    companion object {
        const val TAG = "ExpoIapModule"
    }

    private var billingClientCache: BillingClient? = null
    private val skus: MutableMap<String, ProductDetails> = mutableMapOf()
    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    private val currentActivity
        get() =
            appContext.activityProvider?.currentActivity
                ?: throw MissingCurrentActivityException()

    override fun onPurchasesUpdated(
        billingResult: BillingResult,
        purchases: List<Purchase>?,
    ) {
        val responseCode = billingResult.responseCode
        if (responseCode != BillingClient.BillingResponseCode.OK) {
            val error =
                mutableMapOf<String, Any?>(
                    "responseCode" to responseCode,
                    "debugMessage" to billingResult.debugMessage,
                )
            // Add sub-response code if available (v8.0.0+)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                try {
                    val subResponseCode = billingResult.javaClass.getMethod("getSubResponseCode").invoke(billingResult) as? Int
                    if (subResponseCode != null && subResponseCode != 0) {
                        error["subResponseCode"] = subResponseCode
                        // Check for specific sub-response codes
                        if (subResponseCode == 1) { // PAYMENT_DECLINED_DUE_TO_INSUFFICIENT_FUNDS
                            error["subResponseMessage"] = "Payment declined due to insufficient funds"
                        }
                    }
                } catch (e: Exception) {
                    // Method doesn't exist in older versions, ignore
                }
            }
            val errorData = PlayUtils.getBillingResponseData(responseCode)
            error["code"] = errorData.code
            error["message"] = errorData.message
            try {
                sendEvent(OpenIapEvent.PURCHASE_ERROR, error.toMap())
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send PURCHASE_ERROR event: ${e.message}")
            }
            PromiseUtils.rejectPromisesForKey(IapConstants.PROMISE_BUY_ITEM, errorData.code, errorData.message, null)
            return
        }

        if (purchases != null) {
            val promiseItems = mutableListOf<Map<String, Any?>>()
            purchases.forEach { purchase ->
                val item =
                    mutableMapOf<String, Any?>(
                        "id" to purchase.orderId,
                        "productId" to purchase.products.firstOrNull() as Any?,
                        "ids" to purchase.products,
                        "transactionId" to purchase.orderId, // @deprecated - use id instead
                        "transactionDate" to purchase.purchaseTime.toDouble(),
                        "transactionReceipt" to purchase.originalJson,
                        "purchaseTokenAndroid" to purchase.purchaseToken,
                        "purchaseToken" to purchase.purchaseToken,
                        "dataAndroid" to purchase.originalJson,
                        "signatureAndroid" to purchase.signature,
                        "autoRenewingAndroid" to purchase.isAutoRenewing,
                        "isAcknowledgedAndroid" to purchase.isAcknowledged,
                        "purchaseStateAndroid" to purchase.purchaseState,
                        "packageNameAndroid" to purchase.packageName,
                        "developerPayloadAndroid" to purchase.developerPayload,
                        "platform" to "android",
                    )
                purchase.accountIdentifiers?.let { accountIdentifiers ->
                    item["obfuscatedAccountIdAndroid"] = accountIdentifiers.obfuscatedAccountId
                    item["obfuscatedProfileIdAndroid"] = accountIdentifiers.obfuscatedProfileId
                }
                promiseItems.add(item.toMap())
                try {
                    sendEvent(OpenIapEvent.PURCHASE_UPDATED, item.toMap())
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to send PURCHASE_UPDATED event: ${e.message}")
                }
            }
            PromiseUtils.resolvePromisesForKey(IapConstants.PROMISE_BUY_ITEM, promiseItems)
        } else {
            val result =
                mutableMapOf<String, Any?>(
                    "platform" to "android",
                    "responseCode" to billingResult.responseCode,
                    "debugMessage" to billingResult.debugMessage,
                    "extraMessage" to
                        "The purchases are null. This is a normal behavior if you have requested DEFERRED proration. If not please report an issue.",
                )
            try {
                sendEvent(OpenIapEvent.PURCHASE_UPDATED, result.toMap())
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send PURCHASE_UPDATED event: ${e.message}")
            }
            PromiseUtils.resolvePromisesForKey(IapConstants.PROMISE_BUY_ITEM, result)
        }
    }

    override fun definition() =
        ModuleDefinition {
            Name("ExpoIap")

            Constants(
                "ERROR_CODES" to IapErrorCode.toMap()
            )

            Events(OpenIapEvent.PURCHASE_UPDATED, OpenIapEvent.PURCHASE_ERROR)

            AsyncFunction("initConnection") { promise: Promise ->
                initBillingClient(promise) { promise.resolve(true) }
            }

            AsyncFunction("endConnection") { promise: Promise ->
                billingClientCache?.endConnection()
                billingClientCache = null
                skus.clear()
                promise.resolve(true)
            }

            AsyncFunction("fetchProducts") { type: String, skuArr: Array<String>, promise: Promise ->
                val billingClient = getBillingClientOrReject(promise) ?: return@AsyncFunction

                val skuList =
                    skuArr.map { sku ->
                        QueryProductDetailsParams.Product
                            .newBuilder()
                            .setProductId(sku)
                            .setProductType(type)
                            .build()
                    }

                if (skuList.isEmpty()) {
                    promise.reject(IapErrorCode.E_EMPTY_SKU_LIST, "The SKU list is empty.", null)
                    return@AsyncFunction
                }

                val params =
                    QueryProductDetailsParams
                        .newBuilder()
                        .setProductList(skuList)
                        .build()

                billingClient.queryProductDetailsAsync(params) { billingResult: BillingResult, productDetailsResult: QueryProductDetailsResult ->
                    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                        promise.reject(
                            IapErrorCode.E_QUERY_PRODUCT,
                            "Error querying product details: ${billingResult.debugMessage}",
                            null,
                        )
                        return@queryProductDetailsAsync
                    }

                    val productDetailsList = productDetailsResult.productDetailsList ?: emptyList()

                    val items =
                        productDetailsList.map { productDetails ->
                            skus[productDetails.productId] = productDetails

                            val currency = productDetails.oneTimePurchaseOfferDetails?.priceCurrencyCode
                                ?: productDetails.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()?.priceCurrencyCode
                                ?: "Unknown"
                            val displayPrice = productDetails.oneTimePurchaseOfferDetails?.formattedPrice
                                ?: productDetails.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()?.formattedPrice
                                ?: "N/A"

                            // Prepare reusable data
                            val oneTimePurchaseData = productDetails.oneTimePurchaseOfferDetails?.let {
                                mapOf(
                                    "priceCurrencyCode" to it.priceCurrencyCode,
                                    "formattedPrice" to it.formattedPrice,
                                    "priceAmountMicros" to it.priceAmountMicros.toString(),
                                )
                            }

                            val subscriptionOfferData = productDetails.subscriptionOfferDetails?.map { subscriptionOfferDetailsItem ->
                                mapOf(
                                    "basePlanId" to subscriptionOfferDetailsItem.basePlanId,
                                    "offerId" to subscriptionOfferDetailsItem.offerId,
                                    "offerToken" to subscriptionOfferDetailsItem.offerToken,
                                    "offerTags" to subscriptionOfferDetailsItem.offerTags,
                                    "pricingPhases" to
                                        mapOf(
                                            "pricingPhaseList" to
                                                subscriptionOfferDetailsItem.pricingPhases.pricingPhaseList.map
                                                    { pricingPhaseItem ->
                                                        mapOf(
                                                            "formattedPrice" to pricingPhaseItem.formattedPrice,
                                                            "priceCurrencyCode" to pricingPhaseItem.priceCurrencyCode,
                                                            "billingPeriod" to pricingPhaseItem.billingPeriod,
                                                            "billingCycleCount" to pricingPhaseItem.billingCycleCount,
                                                            "priceAmountMicros" to
                                                                pricingPhaseItem.priceAmountMicros.toString(),
                                                            "recurrenceMode" to pricingPhaseItem.recurrenceMode,
                                                        )
                                                    },
                                        ),
                                )
                            }

                            // Convert Android productType to our expected 'inapp' or 'subs'
                            val productType = if (productDetails.productType == BillingClient.ProductType.SUBS) "subs" else "inapp"

                            mapOf(
                                "id" to productDetails.productId,
                                "title" to productDetails.title,
                                "description" to productDetails.description,
                                "type" to productType,
                                // New field names with Android suffix
                                "nameAndroid" to productDetails.name,
                                "oneTimePurchaseOfferDetailsAndroid" to oneTimePurchaseData,
                                "subscriptionOfferDetailsAndroid" to subscriptionOfferData,
                                "platform" to "android",
                                "currency" to currency,
                                "displayPrice" to displayPrice,

                            )
                        }
                    promise.resolve(items)
                }
            }

            AsyncFunction("requestProducts") { type: String, skuArr: Array<String>, promise: Promise ->
                Log.w("ExpoIap", "WARNING: requestProducts is deprecated. Use fetchProducts instead. The 'request' prefix should only be used for event-based operations. This method will be removed in version 3.0.0.")
                val billingClient = getBillingClientOrReject(promise) ?: return@AsyncFunction

                val skuList =
                    skuArr.map { sku ->
                        QueryProductDetailsParams.Product
                            .newBuilder()
                            .setProductId(sku)
                            .setProductType(type)
                            .build()
                    }

                if (skuList.isEmpty()) {
                    promise.reject(IapErrorCode.E_EMPTY_SKU_LIST, "The SKU list is empty.", null)
                    return@AsyncFunction
                }

                val params =
                    QueryProductDetailsParams
                        .newBuilder()
                        .setProductList(skuList)
                        .build()

                billingClient.queryProductDetailsAsync(params) { billingResult: BillingResult, productDetailsResult: QueryProductDetailsResult ->
                    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                        promise.reject(
                            IapErrorCode.E_QUERY_PRODUCT,
                            "Error querying product details: ${billingResult.debugMessage}",
                            null,
                        )
                        return@queryProductDetailsAsync
                    }

                    val productDetailsList = productDetailsResult.productDetailsList ?: emptyList()

                    val items =
                        productDetailsList.map { productDetails ->
                            skus[productDetails.productId] = productDetails

                            val currency = productDetails.oneTimePurchaseOfferDetails?.priceCurrencyCode
                                ?: productDetails.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()?.priceCurrencyCode
                                ?: "Unknown"
                            val displayPrice = productDetails.oneTimePurchaseOfferDetails?.formattedPrice
                                ?: productDetails.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()?.formattedPrice
                                ?: "N/A"

                            // Prepare reusable data
                            val oneTimePurchaseData = productDetails.oneTimePurchaseOfferDetails?.let {
                                mapOf(
                                    "priceCurrencyCode" to it.priceCurrencyCode,
                                    "formattedPrice" to it.formattedPrice,
                                    "priceAmountMicros" to it.priceAmountMicros.toString(),
                                )
                            }

                            val subscriptionOfferData = productDetails.subscriptionOfferDetails?.map { subscriptionOfferDetailsItem ->
                                mapOf(
                                    "basePlanId" to subscriptionOfferDetailsItem.basePlanId,
                                    "offerId" to subscriptionOfferDetailsItem.offerId,
                                    "offerToken" to subscriptionOfferDetailsItem.offerToken,
                                    "offerTags" to subscriptionOfferDetailsItem.offerTags,
                                    "pricingPhases" to
                                        mapOf(
                                            "pricingPhaseList" to
                                                subscriptionOfferDetailsItem.pricingPhases.pricingPhaseList.map
                                                    { pricingPhaseItem ->
                                                        mapOf(
                                                            "formattedPrice" to pricingPhaseItem.formattedPrice,
                                                            "priceCurrencyCode" to pricingPhaseItem.priceCurrencyCode,
                                                            "billingPeriod" to pricingPhaseItem.billingPeriod,
                                                            "billingCycleCount" to pricingPhaseItem.billingCycleCount,
                                                            "priceAmountMicros" to
                                                                pricingPhaseItem.priceAmountMicros.toString(),
                                                            "recurrenceMode" to pricingPhaseItem.recurrenceMode,
                                                        )
                                                    },
                                        ),
                                )
                            }

                            // Convert Android productType to our expected 'inapp' or 'subs'
                            val productType = if (productDetails.productType == BillingClient.ProductType.SUBS) "subs" else "inapp"

                            mapOf(
                                "id" to productDetails.productId,
                                "title" to productDetails.title,
                                "description" to productDetails.description,
                                "type" to productType,
                                // New field names with Android suffix
                                "nameAndroid" to productDetails.name,
                                "oneTimePurchaseOfferDetailsAndroid" to oneTimePurchaseData,
                                "subscriptionOfferDetailsAndroid" to subscriptionOfferData,
                                "platform" to "android",
                                "currency" to currency,
                                "displayPrice" to displayPrice,

                            )
                        }
                    promise.resolve(items)
                }
            }

            AsyncFunction("getAvailableItemsByType") { type: String, promise: Promise ->
                val billingClient = getBillingClientOrReject(promise) ?: return@AsyncFunction
                val items = mutableListOf<Map<String, Any?>>()
                billingClient.queryPurchasesAsync(
                    QueryPurchasesParams
                        .newBuilder()
                        .setProductType(
                            if (type == "subs") BillingClient.ProductType.SUBS else BillingClient.ProductType.INAPP,
                        ).build(),
                ) { billingResult: BillingResult, purchases: List<Purchase>? ->
                    if (!isValidResult(billingResult, promise)) return@queryPurchasesAsync
                    purchases?.forEach { purchase ->
                        val item =
                            mutableMapOf<String, Any?>(
                                "id" to purchase.orderId,
                                "productId" to purchase.products.firstOrNull() as Any?,
                                "ids" to purchase.products,
                                "transactionId" to purchase.orderId, // @deprecated - use id instead
                                "transactionDate" to purchase.purchaseTime.toDouble(),
                                "transactionReceipt" to purchase.originalJson,
                                "orderId" to purchase.orderId,
                                "purchaseTokenAndroid" to purchase.purchaseToken,
                                "purchaseToken" to purchase.purchaseToken,
                                "developerPayloadAndroid" to purchase.developerPayload,
                                "signatureAndroid" to purchase.signature,
                                "purchaseStateAndroid" to purchase.purchaseState,
                                "isAcknowledgedAndroid" to purchase.isAcknowledged,
                                "packageNameAndroid" to purchase.packageName,
                                "obfuscatedAccountIdAndroid" to purchase.accountIdentifiers?.obfuscatedAccountId,
                                "obfuscatedProfileIdAndroid" to purchase.accountIdentifiers?.obfuscatedProfileId,
                                "platform" to "android",
                            )
                        if (type == BillingClient.ProductType.SUBS) {
                            item["autoRenewingAndroid"] = purchase.isAutoRenewing
                        }
                        items.add(item)
                    }
                    promise.resolve(items)
                }
            }

            // getPurchaseHistoryByType removed in Google Play Billing Library v8
            // Use getAvailableItemsByType instead to get active purchases

            AsyncFunction("requestPurchase") { params: Map<String, Any?>, promise: Promise ->
                val type = params["type"] as String
                val skuArr =
                    (params["skuArr"] as? List<*>)?.filterIsInstance<String>()?.toTypedArray()
                        ?: emptyArray()
                val purchaseToken = params["purchaseToken"] as? String
                val replacementMode = (params["replacementMode"] as? Double)?.toInt() ?: -1
                val obfuscatedAccountId = params["obfuscatedAccountId"] as? String
                val obfuscatedProfileId = params["obfuscatedProfileId"] as? String
                val offerTokenArr =
                    (params["offerTokenArr"] as? List<*>)
                        ?.filterIsInstance<String>()
                        ?.toTypedArray() ?: emptyArray()
                val isOfferPersonalized = params["isOfferPersonalized"] as? Boolean ?: false

                if (currentActivity == null) {
                    promise.reject(IapErrorCode.E_UNKNOWN, "getCurrentActivity returned null", null)
                    return@AsyncFunction
                }

                val billingClient = getBillingClientOrReject(promise) ?: return@AsyncFunction
                    PromiseUtils.addPromiseForKey(IapConstants.PROMISE_BUY_ITEM, promise)

                    if (type == BillingClient.ProductType.SUBS && skuArr.size != offerTokenArr.size) {
                        val debugMessage = "The number of skus (${skuArr.size}) must match: the number of offerTokens (${offerTokenArr.size}) for Subscriptions"
                        try {
                            sendEvent(
                                OpenIapEvent.PURCHASE_ERROR,
                                mapOf(
                                    "debugMessage" to debugMessage,
                                    "code" to IapErrorCode.E_SKU_OFFER_MISMATCH,
                                    "message" to debugMessage,
                                )
                            )
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to send PURCHASE_ERROR event: ${e.message}")
                        }
                        promise.reject(IapErrorCode.E_SKU_OFFER_MISMATCH, debugMessage, null)
                        return@AsyncFunction
                    }

                    val productParamsList =
                        skuArr.mapIndexed { index, sku ->
                            val selectedSku = skus[sku]
                            if (selectedSku == null) {
                                val debugMessage =
                                    "The sku was not found. Please fetch products first by calling getItems"
                                try {
                                    sendEvent(
                                        OpenIapEvent.PURCHASE_ERROR,
                                        mapOf(
                                            "debugMessage" to debugMessage,
                                            "code" to IapErrorCode.E_SKU_NOT_FOUND,
                                            "message" to debugMessage,
                                            "productId" to sku,
                                        ),
                                    )
                                } catch (e: Exception) {
                                    Log.e(TAG, "Failed to send PURCHASE_ERROR event: ${e.message}")
                                }
                                promise.reject(IapErrorCode.E_SKU_NOT_FOUND, debugMessage, null)
                                return@AsyncFunction
                            }

                            val productDetailParams =
                                BillingFlowParams.ProductDetailsParams
                                    .newBuilder()
                                    .setProductDetails(selectedSku)

                            if (type == BillingClient.ProductType.SUBS) {
                                productDetailParams.setOfferToken(offerTokenArr[index])
                            }

                            productDetailParams.build()
                        }

                    val builder =
                        BillingFlowParams
                            .newBuilder()
                            .setProductDetailsParamsList(productParamsList)
                            .setIsOfferPersonalized(isOfferPersonalized)

                    if (purchaseToken != null) {
                        val subscriptionUpdateParams =
                            SubscriptionUpdateParams
                                .newBuilder()
                                .setOldPurchaseToken(purchaseToken)

                        if (type == BillingClient.ProductType.SUBS && replacementMode != -1) {
                            val mode =
                                when (replacementMode) {
                                    SubscriptionUpdateParams.ReplacementMode.CHARGE_PRORATED_PRICE ->
                                        SubscriptionUpdateParams.ReplacementMode.CHARGE_PRORATED_PRICE
                                    SubscriptionUpdateParams.ReplacementMode.WITHOUT_PRORATION ->
                                        SubscriptionUpdateParams.ReplacementMode.WITHOUT_PRORATION
                                    SubscriptionUpdateParams.ReplacementMode.DEFERRED ->
                                        SubscriptionUpdateParams.ReplacementMode.DEFERRED
                                    SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION ->
                                        SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION
                                    SubscriptionUpdateParams.ReplacementMode.CHARGE_FULL_PRICE ->
                                        SubscriptionUpdateParams.ReplacementMode.CHARGE_FULL_PRICE
                                    else -> SubscriptionUpdateParams.ReplacementMode.UNKNOWN_REPLACEMENT_MODE
                                }
                            subscriptionUpdateParams.setSubscriptionReplacementMode(mode)
                        }
                        builder.setSubscriptionUpdateParams(subscriptionUpdateParams.build())
                    }

                    obfuscatedAccountId?.let { builder.setObfuscatedAccountId(it) }
                    obfuscatedProfileId?.let { builder.setObfuscatedProfileId(it) }

                    val flowParams = builder.build()
                    val billingResult = billingClient.launchBillingFlow(currentActivity, flowParams)

                    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                        val errorData = PlayUtils.getBillingResponseData(billingResult.responseCode)
                        var errorMessage = billingResult.debugMessage ?: errorData.message
                        var subResponseCode: Int? = null

                        // Check for sub-response codes (v8.0.0+)
                        try {
                            subResponseCode = billingResult.javaClass.getMethod("getSubResponseCode").invoke(billingResult) as? Int
                            if (subResponseCode != null && subResponseCode != 0) {
                                if (subResponseCode == 1) { // PAYMENT_DECLINED_DUE_TO_INSUFFICIENT_FUNDS
                                    errorMessage = "$errorMessage (Payment declined due to insufficient funds)"
                                } else {
                                    errorMessage = "$errorMessage (Sub-response code: $subResponseCode)"
                                }
                            }
                        } catch (e: Exception) {
                            // Method doesn't exist in older versions, ignore
                        }

                        // Send error event to match iOS behavior
                        val errorMap = mutableMapOf<String, Any?>(
                            "responseCode" to billingResult.responseCode,
                            "debugMessage" to billingResult.debugMessage,
                            "code" to errorData.code,
                            "message" to errorMessage
                        )

                        // Add product ID if available
                        if (skuArr.isNotEmpty()) {
                            errorMap["productId"] = skuArr.first()
                        }

                        // Add sub-response code if available
                        subResponseCode?.let {
                            if (it != 0) {
                                errorMap["subResponseCode"] = it
                            }
                        }

                        try {
                            sendEvent(OpenIapEvent.PURCHASE_ERROR, errorMap.toMap())
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to send PURCHASE_ERROR event: ${e.message}")
                        }

                        promise.reject(errorData.code, errorMessage, null)
                        return@AsyncFunction
                    }
            }

            AsyncFunction("acknowledgePurchaseAndroid") {
                    token: String,
                    promise: Promise,
                ->
                val billingClient = getBillingClientOrReject(promise) ?: return@AsyncFunction
                    val acknowledgePurchaseParams =
                        AcknowledgePurchaseParams
                            .newBuilder()
                            .setPurchaseToken(token)
                            .build()

                    billingClient.acknowledgePurchase(acknowledgePurchaseParams) { billingResult: BillingResult ->
                        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                            PlayUtils.rejectPromiseWithBillingError(
                                promise,
                                billingResult.responseCode,
                            )
                            return@acknowledgePurchase
                        }

                        val map = mutableMapOf<String, Any?>()
                        map["responseCode"] = billingResult.responseCode
                        map["debugMessage"] = billingResult.debugMessage
                        val errorData = PlayUtils.getBillingResponseData(billingResult.responseCode)
                        map["code"] = errorData.code
                        map["message"] = errorData.message
                        promise.resolve(map)
                    }
            }

            AsyncFunction("consumeProductAndroid") {
                    token: String,
                    promise: Promise,
                ->

                val params = ConsumeParams.newBuilder().setPurchaseToken(token).build()

                val billingClient = getBillingClientOrReject(promise) ?: return@AsyncFunction
                billingClient.consumeAsync(params) { billingResult: BillingResult, purchaseToken: String? ->
                    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                        PlayUtils.rejectPromiseWithBillingError(
                            promise,
                            billingResult.responseCode,
                        )
                        return@consumeAsync
                    }

                    val map = mutableMapOf<String, Any?>()
                    map["responseCode"] = billingResult.responseCode
                    map["debugMessage"] = billingResult.debugMessage
                    val errorData = PlayUtils.getBillingResponseData(billingResult.responseCode)
                    map["code"] = errorData.code
                    map["message"] = errorData.message
                    map["purchaseTokenAndroid"] = purchaseToken
                    promise.resolve(map)
                }
            }


            AsyncFunction("getStorefront") {
                    promise: Promise,
                ->
                val billingClient = getBillingClientOrReject(promise) ?: return@AsyncFunction
                billingClient.getBillingConfigAsync(
                    GetBillingConfigParams.newBuilder().build(),
                    BillingConfigResponseListener { result: BillingResult, config: BillingConfig? ->
                        if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                            promise.safeResolve(config?.countryCode.orEmpty())
                        } else {
                            val debugMessage = result.debugMessage.orEmpty()
                            promise.safeReject(result.responseCode.toString(), debugMessage)
                        }
                    },
                )
            }
        }

    /**
     * Rejects promise with billing code if BillingResult is not OK
     */
    private fun isValidResult(
        billingResult: BillingResult,
        promise: Promise,
    ): Boolean {
        Log.d(TAG, "responseCode: " + billingResult.responseCode)
        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            PlayUtils.rejectPromiseWithBillingError(promise, billingResult.responseCode)
            return false
        }
        return true
    }

    private fun getBillingClientOrReject(promise: Promise): BillingClient? {
        val client = billingClientCache
        if (client == null) {
            promise.reject(
                IapErrorCode.E_INIT_CONNECTION,
                "Connection not initialized. Call initConnection() first.",
                null,
            )
            return null
        }
        if (!client.isReady) {
            promise.reject(
                IapErrorCode.E_INIT_CONNECTION,
                "BillingClient not ready. Wait for initConnection() to complete.",
                null,
            )
            return null
        }
        return client
    }

    private fun initBillingClient(
        promise: Promise,
        callback: (billingClient: BillingClient) -> Unit,
    ) {
        if (GoogleApiAvailability
                .getInstance()
                .isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS
        ) {
            Log.i(TAG, "Google Play Services are not available on this device")
            promise.reject(
                IapErrorCode.E_NOT_PREPARED,
                "Google Play Services are not available on this device",
                null,
            )
            return
        }

        billingClientCache =
            BillingClient
                .newBuilder(context)
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection() // Automatically handle service disconnections
                .build()

        billingClientCache?.startConnection(
            object : BillingClientStateListener {
                override fun onBillingSetupFinished(billingResult: BillingResult) {
                    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                        promise.reject(
                            IapErrorCode.E_INIT_CONNECTION,
                            "Billing setup finished with error: ${billingResult.debugMessage}",
                            null,
                        )
                        return
                    }
                    callback(billingClientCache!!)
                }

                override fun onBillingServiceDisconnected() {
                    Log.i(TAG, "Billing service disconnected")
                }
            },
        )
    }
}
