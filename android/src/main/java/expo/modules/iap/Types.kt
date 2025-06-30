package expo.modules.iap

/**
 * Error codes for IAP operations - centralized error code management
 * Single source of truth for all error codes used across the module
 */
object IapErrorCode {
    // Constants for code usage - Android specific error codes
    const val E_NOT_PREPARED = "E_NOT_PREPARED"
    const val E_INIT_CONNECTION = "E_INIT_CONNECTION"
    const val E_QUERY_PRODUCT = "E_QUERY_PRODUCT"
    const val E_UNKNOWN = "E_UNKNOWN"
    const val E_SKU_OFFER_MISMATCH = "E_SKU_OFFER_MISMATCH"
    const val E_SKU_NOT_FOUND = "E_SKU_NOT_FOUND"
    const val E_USER_CANCELLED = "E_USER_CANCELLED"
    const val E_DEVELOPER_ERROR = "E_DEVELOPER_ERROR"
    const val E_ITEM_UNAVAILABLE = "E_ITEM_UNAVAILABLE"
    const val E_SERVICE_ERROR = "E_SERVICE_ERROR"
    const val E_PURCHASE_ERROR = "E_PURCHASE_ERROR"
    
    // Cached map for Constants export - initialized once at class loading time
    // Using constants as keys to avoid duplication and ensure type safety
    private val _cachedMap: Map<String, String> = mapOf(
        E_NOT_PREPARED to E_NOT_PREPARED,
        E_INIT_CONNECTION to E_INIT_CONNECTION,
        E_QUERY_PRODUCT to E_QUERY_PRODUCT,
        E_UNKNOWN to E_UNKNOWN,
        E_SKU_OFFER_MISMATCH to E_SKU_OFFER_MISMATCH,
        E_SKU_NOT_FOUND to E_SKU_NOT_FOUND,
        E_USER_CANCELLED to E_USER_CANCELLED,
        E_DEVELOPER_ERROR to E_DEVELOPER_ERROR,
        E_ITEM_UNAVAILABLE to E_ITEM_UNAVAILABLE,
        E_SERVICE_ERROR to E_SERVICE_ERROR,
        E_PURCHASE_ERROR to E_PURCHASE_ERROR
    )
    
    // Return cached map reference - no new allocations on repeated calls
    fun toMap(): Map<String, String> = _cachedMap
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
