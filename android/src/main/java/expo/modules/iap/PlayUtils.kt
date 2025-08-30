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

    fun addPromiseForKey(
        key: String,
        promise: Promise,
    ) {
        promises.getOrPut(key) { mutableListOf() }.add(promise)
    }

    fun resolvePromisesForKey(
        key: String,
        value: Any?,
    ) {
        promises[key]?.forEach { promise ->
            promise.safeResolve(value)
        }
        promises.remove(key)
    }

    fun rejectAllPendingPromises() {
        promises.flatMap { it.value }.forEach { promise ->
            promise.safeReject(IapErrorCode.E_CONNECTION_CLOSED, "Connection has been closed", null)
        }
        promises.clear()
    }

    fun rejectPromisesForKey(
        key: String,
        code: String,
        message: String?,
        err: Exception?,
    ) {
        promises[key]?.forEach { promise ->
            promise.safeReject(code, message, err)
        }
        promises.remove(key)
    }
}

const val TAG = "IapPromises"

fun Promise.safeResolve(value: Any?) {
    try {
        this.resolve(value)
    } catch (e: RuntimeException) {
        Log.d(TAG, "Already consumed ${e.message}")
    }
}

fun Promise.safeReject(message: String) = this.safeReject(message, null, null)

fun Promise.safeReject(
    code: String,
    message: String?,
) = this.safeReject(code, message, null)

fun Promise.safeReject(
    code: String,
    throwable: Throwable?,
) = this.safeReject(code, null, throwable)

fun Promise.safeReject(
    code: String,
    message: String?,
    throwable: Throwable?,
) {
    try {
        this.reject(code, message, throwable)
    } catch (e: RuntimeException) {
        Log.d(TAG, "Already consumed ${e.message}")
    }
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
                        IapErrorCode.E_SERVICE_ERROR,
                        "This feature is not available on your device.",
                    )
                }
                BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> {
                    BillingResponse(
                        IapErrorCode.E_NETWORK_ERROR,
                        "The service is disconnected (check your internet connection.)",
                    )
                }
                BillingClient.BillingResponseCode.NETWORK_ERROR -> {
                    BillingResponse(
                        IapErrorCode.E_NETWORK_ERROR,
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
                        IapErrorCode.E_USER_CANCELLED,
                        "Payment is cancelled.",
                    )
                }
                BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> {
                    BillingResponse(
                        IapErrorCode.E_SERVICE_ERROR,
                        "The service is unreachable. This may be your internet connection, or the Play Store may be down.",
                    )
                }
                BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> {
                    BillingResponse(
                        IapErrorCode.E_SERVICE_ERROR,
                        "Billing is unavailable. This may be a problem with your device, or the Play Store may be down.",
                    )
                }
                BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> {
                    BillingResponse(
                        IapErrorCode.E_ITEM_UNAVAILABLE,
                        "That item is unavailable.",
                    )
                }
                BillingClient.BillingResponseCode.DEVELOPER_ERROR -> {
                    BillingResponse(
                        IapErrorCode.E_DEVELOPER_ERROR,
                        "Google is indicating that we have some issue connecting to payment.",
                    )
                }
                BillingClient.BillingResponseCode.ERROR -> {
                    BillingResponse(
                        IapErrorCode.E_UNKNOWN,
                        "An unknown or unexpected error has occurred. Please try again later.",
                    )
                }
                BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                    BillingResponse(
                        IapErrorCode.E_ALREADY_OWNED,
                        "You already own this item.",
                    )
                }
                else -> {
                    BillingResponse(
                        IapErrorCode.E_UNKNOWN,
                        "Purchase failed with code: $responseCode",
                    )
                }
            }
        Log.e(TAG, "Error Code: $responseCode")
        return errorData
    }
}
