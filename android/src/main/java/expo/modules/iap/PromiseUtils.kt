package expo.modules.iap

import android.util.Log
import dev.hyo.openiap.OpenIapError
import expo.modules.kotlin.Promise

object PromiseUtils {
    private val promises = java.util.concurrent.ConcurrentHashMap<String, java.util.concurrent.CopyOnWriteArrayList<Promise>>()

    const val TAG = "PromiseUtils"

    // React Native specific promise key used by JS bridge
    const val PROMISE_BUY_ITEM = "PROMISE_BUY_ITEM"

    fun addPromiseForKey(
        key: String,
        promise: Promise,
    ) {
        promises.computeIfAbsent(key) { java.util.concurrent.CopyOnWriteArrayList() }.add(promise)
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
        // Snapshot to avoid concurrent modification
        promises.values.flatMap { it.toList() }.forEach { promise ->
            promise.safeReject(OpenIapError.ServiceDisconnected.CODE, "Connection has been closed", null)
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

fun Promise.safeReject(message: String) = this.safeReject(OpenIapError.UnknownError.CODE, message, null)

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
