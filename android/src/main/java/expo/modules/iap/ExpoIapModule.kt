package expo.modules.iap

import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoIapModule : Module(), PurchasesUpdatedListener {
    companion object {
        const val TAG = "ExpoIapModule"
        const val E_NOT_PREPARED = "E_NOT_PREPARED"
        const val E_INIT_CONNECTION = "E_INIT_CONNECTION"
        const val E_QUERY_PRODUCT = "E_QUERY_PRODUCT"
        const val EMPTY_SKU_LIST = "EMPTY_SKU_LIST"
    }

    private var billingClientCache: BillingClient? = null
    private val skus: MutableMap<String, ProductDetails> = mutableMapOf()
    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    private val currentActivity
        get() = appContext.activityProvider?.currentActivity
            ?: throw MissingCurrentActivityException()

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            sendEvent("purchase-error", mapOf("responseCode" to billingResult.responseCode, "debugMessage" to billingResult.debugMessage))
        } else if (purchases != null) {
            val purchaseData = purchases.map { purchase ->
                mapOf(
                    "productId" to purchase.products[0],
                    "transactionId" to purchase.orderId,
                    "transactionDate" to purchase.purchaseTime,
                    "transactionReceipt" to purchase.originalJson,
                    "purchaseToken" to purchase.purchaseToken,
                    "isAcknowledged" to purchase.isAcknowledged,
                    "purchaseState" to purchase.purchaseState
                )
            }

            purchaseData.forEach { purchase ->
                sendEvent("purchase-updated", purchase)
            }
        }
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoIap")

        Constants("PI" to Math.PI)

        Events("onChange", "purchase-error", "purchase-updated")

        AsyncFunction("initConnection") { promise: Promise ->
            initBillingClient(promise) { promise.resolve(true) }
        }

        AsyncFunction("endConnection") { promise: Promise ->
            billingClientCache?.endConnection()
            billingClientCache = null
            skus.clear()
            promise.resolve(true)
        }

        AsyncFunction("getItemsByType") { type: String, skuArr: Array<String>, promise: Promise ->
            ensureConnection(promise) { billingClient ->
                val skuList = skuArr.map { sku ->
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(sku)
                        .setProductType(type)
                        .build()
                }

                if (skuList.isEmpty()) {
                    promise.reject(EMPTY_SKU_LIST, "The SKU list is empty.", null)
                    return@ensureConnection
                }

                val params = QueryProductDetailsParams.newBuilder().setProductList(skuList).build()

                billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
                    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                        promise.reject(E_QUERY_PRODUCT, "Error querying product details: ${billingResult.debugMessage}", null)
                        return@queryProductDetailsAsync
                    }

                    val items = productDetailsList.map { productDetails ->
                        skus[productDetails.productId] = productDetails

                        mapOf(
                            "productId" to productDetails.productId,
                            "title" to productDetails.title,
                            "description" to productDetails.description,
                            "productType" to productDetails.productType,
                            "name" to productDetails.name,
                            "oneTimePurchaseOfferDetails" to productDetails.oneTimePurchaseOfferDetails?.let {
                                mapOf(
                                    "priceCurrencyCode" to it.priceCurrencyCode,
                                    "formattedPrice" to it.formattedPrice,
                                    "priceAmountMicros" to it.priceAmountMicros.toString()
                                )
                            },
                            "subscriptionOfferDetails" to productDetails.subscriptionOfferDetails?.map { subscriptionOfferDetailsItem ->
                                mapOf(
                                    "basePlanId" to subscriptionOfferDetailsItem.basePlanId,
                                    "offerId" to subscriptionOfferDetailsItem.offerId,
                                    "offerToken" to subscriptionOfferDetailsItem.offerToken,
                                    "offerTags" to subscriptionOfferDetailsItem.offerTags,
                                    "pricingPhases" to mapOf(
                                        "pricingPhaseList" to subscriptionOfferDetailsItem.pricingPhases.pricingPhaseList.map { pricingPhaseItem ->
                                            mapOf(
                                                "formattedPrice" to pricingPhaseItem.formattedPrice,
                                                "priceCurrencyCode" to pricingPhaseItem.priceCurrencyCode,
                                                "billingPeriod" to pricingPhaseItem.billingPeriod,
                                                "billingCycleCount" to pricingPhaseItem.billingCycleCount,
                                                "priceAmountMicros" to pricingPhaseItem.priceAmountMicros.toString(),
                                                "recurrenceMode" to pricingPhaseItem.recurrenceMode
                                            )
                                        }
                                    )
                                )
                            }
                        )
                    }
                    promise.resolve(items)
                }
            }
        }

        AsyncFunction("getAvailableItemsByType") { type: String, promise: Promise ->
            ensureConnection(promise) { billingClient ->
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
                        val item = mutableMapOf<String, Any?>(
                            "productId" to purchase.products[0], // kept for convenience/backward-compatibility. productIds has the complete list
                            "productIds" to purchase.products,
                            "transactionId" to purchase.orderId,
                            "transactionDate" to purchase.purchaseTime.toDouble(),
                            "transactionReceipt" to purchase.originalJson,
                            "orderId" to purchase.orderId,
                            "purchaseToken" to purchase.purchaseToken,
                            "developerPayloadAndroid" to purchase.developerPayload,
                            "signatureAndroid" to purchase.signature,
                            "purchaseStateAndroid" to purchase.purchaseState,
                            "isAcknowledgedAndroid" to purchase.isAcknowledged,
                            "packageNameAndroid" to purchase.packageName,
                            "obfuscatedAccountIdAndroid" to purchase.accountIdentifiers?.obfuscatedAccountId,
                            "obfuscatedProfileIdAndroid" to purchase.accountIdentifiers?.obfuscatedProfileId
                        )
                        if (type == BillingClient.ProductType.SUBS) {
                            item["autoRenewingAndroid"] = purchase.isAutoRenewing
                        }
                        items.add(item)
                    }
                    promise.resolve(items)
                }
            }
        }

        AsyncFunction("getPurchaseHistoryByType") { type: String, promise: Promise ->
            ensureConnection(promise) { billingClient ->
                billingClient.queryPurchaseHistoryAsync(
                    QueryPurchaseHistoryParams
                        .newBuilder()
                        .setProductType(
                            if (type == "subs") BillingClient.ProductType.SUBS else BillingClient.ProductType.INAPP
                        ).build()
                ) { billingResult: BillingResult, purchaseHistoryRecordList: List<PurchaseHistoryRecord>? ->

                    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                        PlayUtils.rejectPromiseWithBillingError(promise, billingResult.responseCode)
                        return@queryPurchaseHistoryAsync
                    }

                    Log.d(TAG, purchaseHistoryRecordList.toString())
                    val items = mutableListOf<Map<String, Any?>>()
                    purchaseHistoryRecordList?.forEach { purchase ->
                        val item = mutableMapOf<String, Any?>(
                            "productId" to purchase.products[0],
                            "productIds" to purchase.products,
                            "transactionDate" to purchase.purchaseTime.toDouble(),
                            "transactionReceipt" to purchase.originalJson,
                            "purchaseToken" to purchase.purchaseToken,
                            "dataAndroid" to purchase.originalJson,
                            "signatureAndroid" to purchase.signature,
                            "developerPayload" to purchase.developerPayload
                        )
                        items.add(item)
                    }
                    promise.resolve(items)
                }
            }
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

    private fun ensureConnection(promise: Promise, callback: (billingClient: BillingClient) -> Unit) {
        if (billingClientCache?.isReady == true) {
            callback(billingClientCache!!)
            return
        }

        initBillingClient(promise, callback)
    }

    private fun initBillingClient(promise: Promise, callback: (billingClient: BillingClient) -> Unit) {
        if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) {
            Log.i(TAG, "Google Play Services are not available on this device")
            promise.reject(E_NOT_PREPARED, "Google Play Services are not available on this device", null)
            return
        }

        billingClientCache = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        billingClientCache?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                    promise.reject(E_INIT_CONNECTION, "Billing setup finished with error: ${billingResult.debugMessage}", null)
                    return
                }
                callback(billingClientCache!!)
            }

            override fun onBillingServiceDisconnected() {
                Log.i(TAG, "Billing service disconnected")
            }
        })
    }
}
