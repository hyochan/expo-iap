package expo.modules.iap

/**
 * Error codes for IAP operations - centralized error code management
 * Single source of truth for all error codes used across the module
 */
object IapErrorCode {
    // Connection and initialization errors
    const val E_NOT_PREPARED = "E_NOT_PREPARED"
    const val E_INIT_CONNECTION = "E_INIT_CONNECTION"
    const val E_SERVICE_DISCONNECTED = "E_SERVICE_DISCONNECTED"
    const val E_ALREADY_PREPARED = "E_ALREADY_PREPARED"
    const val E_CONNECTION_CLOSED = "E_CONNECTION_CLOSED"
    
    // Product and purchase errors
    const val E_QUERY_PRODUCT = "E_QUERY_PRODUCT"
    const val E_SKU_NOT_FOUND = "E_SKU_NOT_FOUND"
    const val E_SKU_OFFER_MISMATCH = "E_SKU_OFFER_MISMATCH"
    const val E_PURCHASE_ERROR = "E_PURCHASE_ERROR"
    const val E_USER_CANCELLED = "E_USER_CANCELLED"
    const val E_PENDING = "E_PENDING"
    
    // Service and developer errors
    const val E_SERVICE_ERROR = "E_SERVICE_ERROR"
    const val E_DEVELOPER_ERROR = "E_DEVELOPER_ERROR"
    const val E_ITEM_UNAVAILABLE = "E_ITEM_UNAVAILABLE"
    const val E_ALREADY_OWNED = "E_ALREADY_OWNED"
    const val E_ITEM_NOT_OWNED = "E_ITEM_NOT_OWNED"
    
    // Network and billing errors
    const val E_NETWORK_ERROR = "E_NETWORK_ERROR"
    const val E_BILLING_UNAVAILABLE = "E_BILLING_UNAVAILABLE"
    const val E_FEATURE_NOT_SUPPORTED = "E_FEATURE_NOT_SUPPORTED"
    const val E_BILLING_RESPONSE_JSON_PARSE_ERROR = "E_BILLING_RESPONSE_JSON_PARSE_ERROR"
    
    // Activity and UI errors
    const val E_ACTIVITY_UNAVAILABLE = "E_ACTIVITY_UNAVAILABLE"
    
    // User and remote errors
    const val E_USER_ERROR = "E_USER_ERROR"
    const val E_REMOTE_ERROR = "E_REMOTE_ERROR"
    const val E_NOT_ENDED = "E_NOT_ENDED"
    
    // Unknown error
    const val E_UNKNOWN = "E_UNKNOWN"
    
    // Empty SKU list error
    const val E_EMPTY_SKU_LIST = "E_EMPTY_SKU_LIST"
    
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
        E_PURCHASE_ERROR to E_PURCHASE_ERROR,
        E_ACTIVITY_UNAVAILABLE to E_ACTIVITY_UNAVAILABLE,
        E_ALREADY_PREPARED to E_ALREADY_PREPARED,
        E_PENDING to E_PENDING,
        E_NOT_ENDED to E_NOT_ENDED,
        E_NETWORK_ERROR to E_NETWORK_ERROR,
        E_ALREADY_OWNED to E_ALREADY_OWNED,
        E_REMOTE_ERROR to E_REMOTE_ERROR,
        E_USER_ERROR to E_USER_ERROR,
        E_BILLING_RESPONSE_JSON_PARSE_ERROR to E_BILLING_RESPONSE_JSON_PARSE_ERROR,
        E_CONNECTION_CLOSED to E_CONNECTION_CLOSED,
        E_SERVICE_DISCONNECTED to E_SERVICE_DISCONNECTED,
        E_BILLING_UNAVAILABLE to E_BILLING_UNAVAILABLE,
        E_FEATURE_NOT_SUPPORTED to E_FEATURE_NOT_SUPPORTED,
        E_ITEM_NOT_OWNED to E_ITEM_NOT_OWNED,
        E_EMPTY_SKU_LIST to E_EMPTY_SKU_LIST
    )
    
    // Return cached map reference - no new allocations on repeated calls
    fun toMap(): Map<String, String> = _cachedMap
}

/**
 * IAP Event constants
 */
object OpenIapEvent {
    const val PURCHASE_UPDATED = "purchase-updated"
    const val PURCHASE_ERROR = "purchase-error"
}

/**
 * Other IAP-related constants (Promise keys, etc.)
 */
object IapConstants {
    const val PROMISE_BUY_ITEM = "PROMISE_BUY_ITEM"
}
