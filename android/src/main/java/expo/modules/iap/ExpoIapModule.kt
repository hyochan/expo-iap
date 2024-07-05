package expo.modules.iap

import android.content.Context
import android.util.Log
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoIapModule : Module(), PurchasesUpdatedListener {
    companion object {
        const val TAG = "ExpoIapModule"
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
            val purchases = purchases.map { purchase ->
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

            purchases.forEach { purchase ->
                sendEvent("purchase-updated", purchase)
            }
        }
    }

    override fun definition() =
        ModuleDefinition {
            Name("ExpoIap")

            Constants(
                "PI" to Math.PI,
            )

            Events("onChange", "purchase-error", "purchase-updated")

            AsyncFunction("initConnection") { promise: Promise ->
                if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) {
                    Log.i(TAG, "Google Play Services are not available on this device")
                    promise.reject("E_NOT_PREPARED", "Google Play Services are not available on this device", null)
                    return@AsyncFunction
                }

                if (billingClientCache?.isReady == true) {
                    Log.i(TAG, "Already initialized, you should only call initConnection() once when your app starts")
                    promise.resolve(true)
                    return@AsyncFunction
                }

                billingClientCache = BillingClient.newBuilder(context)
                    .setListener(this@ExpoIapModule)
                    .enablePendingPurchases()
                    .build()

                billingClientCache?.startConnection(object : BillingClientStateListener {
                    override fun onBillingSetupFinished(billingResult: BillingResult) {
                        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                            promise.reject("E_INIT_CONNECTION", "Billing setup finished with error: ${billingResult.debugMessage}", null)
                            return
                        }
                        promise.resolve(true)
                    }

                    override fun onBillingServiceDisconnected() {
                        Log.i(TAG, "Billing service disconnected")
                    }
                })
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
                        promise.reject("EMPTY_SKU_LIST", "The SKU list is empty.", null)
                        return@ensureConnection
                    }

                    val params = QueryProductDetailsParams.newBuilder().setProductList(skuList).build()

                    billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
                        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                            promise.reject("E_QUERY_PRODUCT", "Error querying product details: ${billingResult.debugMessage}", null)
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
        }

    private fun ensureConnection(promise: Promise, callback: (billingClient: BillingClient) -> Unit) {
        val billingClient = billingClientCache
        if (billingClient?.isReady == true) {
            callback(billingClient)
            return
        }

        billingClientCache = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        billingClientCache?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                    promise.reject("E_INIT_CONNECTION", "Billing setup finished with error: ${billingResult.debugMessage}", null)
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
