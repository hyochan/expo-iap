package expo.modules.iap

import android.util.Log
import com.android.billingclient.api.BillingClient
import expo.modules.kotlin.Promise

data class BillingResponse(
    val code: String,
    val message: String,
)

object PromiseUtils {
    private val promises = HashMap<String, MutableList<Promise>>()

    const val TAG = "PromiseUtils"
    const val E_ACTIVITY_UNAVAILABLE = "E_ACTIVITY_UNAVAILABLE"
    const val E_UNKNOWN = "E_UNKNOWN"
    const val E_NOT_PREPARED = "E_NOT_PREPARED"
    const val E_ALREADY_PREPARED = "E_ALREADY_PREPARED"
    const val E_PENDING = "E_PENDING"
    const val E_NOT_ENDED = "E_NOT_ENDED"
    const val E_USER_CANCELLED = "E_USER_CANCELLED"
    const val E_ITEM_UNAVAILABLE = "E_ITEM_UNAVAILABLE"
    const val E_NETWORK_ERROR = "E_NETWORK_ERROR"
    const val E_SERVICE_ERROR = "E_SERVICE_ERROR"
    const val E_ALREADY_OWNED = "E_ALREADY_OWNED"
    const val E_REMOTE_ERROR = "E_REMOTE_ERROR"
    const val E_USER_ERROR = "E_USER_ERROR"
    const val E_DEVELOPER_ERROR = "E_DEVELOPER_ERROR"
    const val E_BILLING_RESPONSE_JSON_PARSE_ERROR = "E_BILLING_RESPONSE_JSON_PARSE_ERROR"
    const val E_CONNECTION_CLOSED = "E_CONNECTION_CLOSED"
}

object PlayUtils {
    const val TAG = "PlayUtils"

    fun rejectPromiseWithBillingError(
        promise: Promise,
        responseCode: Int,
    ) {
        val errorData = getBillingResponseData(responseCode)
        promise.reject(errorData.code, errorData.message, null)
    }

    fun getBillingResponseData(responseCode: Int): BillingResponse {
        val errorData =
            when (responseCode) {
                BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED -> {
                    BillingResponse(
                        PromiseUtils.E_SERVICE_ERROR,
                        "This feature is not available on your device.",
                    )
                }
                BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> {
                    BillingResponse(
                        PromiseUtils.E_NETWORK_ERROR,
                        "The service is disconnected (check your internet connection.)",
                    )
                }
                BillingClient.BillingResponseCode.NETWORK_ERROR -> {
                    BillingResponse(
                        PromiseUtils.E_NETWORK_ERROR,
                        "You have a problem with network connection.",
                    )
                }
                BillingClient.BillingResponseCode.OK -> {
                    BillingResponse(
                        "OK",
                        "",
                    )
                }
                BillingClient.BillingResponseCode.USER_CANCELED -> {
                    BillingResponse(
                        PromiseUtils.E_USER_CANCELLED,
                        "Payment is cancelled.",
                    )
                }
                BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> {
                    BillingResponse(
                        PromiseUtils.E_SERVICE_ERROR,
                        "The service is unreachable. This may be your internet connection, or the Play Store may be down.",
                    )
                }
                BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> {
                    BillingResponse(
                        PromiseUtils.E_SERVICE_ERROR,
                        "Billing is unavailable. This may be a problem with your device, or the Play Store may be down.",
                    )
                }
                BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> {
                    BillingResponse(
                        PromiseUtils.E_ITEM_UNAVAILABLE,
                        "That item is unavailable.",
                    )
                }
                BillingClient.BillingResponseCode.DEVELOPER_ERROR -> {
                    BillingResponse(
                        PromiseUtils.E_DEVELOPER_ERROR,
                        "Google is indicating that we have some issue connecting to payment.",
                    )
                }
                BillingClient.BillingResponseCode.ERROR -> {
                    BillingResponse(
                        PromiseUtils.E_UNKNOWN,
                        "An unknown or unexpected error has occurred. Please try again later.",
                    )
                }
                BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                    BillingResponse(
                        PromiseUtils.E_ALREADY_OWNED,
                        "You already own this item.",
                    )
                }
                else -> {
                    BillingResponse(
                        PromiseUtils.E_UNKNOWN,
                        "Purchase failed with code: $responseCode",
                    )
                }
            }
        Log.e(TAG, "Error Code: $responseCode")
        return errorData
    }
}
