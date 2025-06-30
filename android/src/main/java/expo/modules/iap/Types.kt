package expo.modules.iap

/**
 * Error codes for IAP operations - centralized error code management
 * Single source of truth for all error codes used across the module
 */
object IapErrorCode {
    private val codes = listOf(
        "E_NOT_PREPARED",
        "E_INIT_CONNECTION", 
        "E_QUERY_PRODUCT",
        "E_UNKNOWN",
        "E_SKU_OFFER_MISMATCH",
        "E_SKU_NOT_FOUND",
        "E_USER_CANCELLED",
        "E_DEVELOPER_ERROR",
        "E_ITEM_UNAVAILABLE",
        "E_SERVICE_ERROR",
        "E_PURCHASE_ERROR"
    ).associateWith { it }
    
    // Constants for code usage - automatically generated
    val E_NOT_PREPARED by lazy { codes["E_NOT_PREPARED"]!! }
    val E_INIT_CONNECTION by lazy { codes["E_INIT_CONNECTION"]!! }
    val E_QUERY_PRODUCT by lazy { codes["E_QUERY_PRODUCT"]!! }
    val E_UNKNOWN by lazy { codes["E_UNKNOWN"]!! }
    val E_SKU_OFFER_MISMATCH by lazy { codes["E_SKU_OFFER_MISMATCH"]!! }
    val E_SKU_NOT_FOUND by lazy { codes["E_SKU_NOT_FOUND"]!! }
    val E_USER_CANCELLED by lazy { codes["E_USER_CANCELLED"]!! }
    val E_DEVELOPER_ERROR by lazy { codes["E_DEVELOPER_ERROR"]!! }
    val E_ITEM_UNAVAILABLE by lazy { codes["E_ITEM_UNAVAILABLE"]!! }
    val E_SERVICE_ERROR by lazy { codes["E_SERVICE_ERROR"]!! }
    val E_PURCHASE_ERROR by lazy { codes["E_PURCHASE_ERROR"]!! }
    
    // Convert to map for Constants export
    fun toMap() = codes
}

/**
 * IAP Event constants
 */
object IapEvent {
    const val PURCHASE_UPDATED = "purchase-updated"
    const val PURCHASE_ERROR = "purchase-error"
}

/**
 * Other IAP-related constants
 */
object IapConstants {
    const val EMPTY_SKU_LIST = "EMPTY_SKU_LIST"
    const val PROMISE_BUY_ITEM = "PROMISE_BUY_ITEM"
}
