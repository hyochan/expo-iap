//
//  IapTypes.swift
//  RNIap
//
//  Created by Andres Aguilar on 8/18/22.
//

import Foundation
import StoreKit

public enum StoreError: Error {
    case failedVerification
}

// Error codes for IAP operations - centralized error code management
struct IapErrorCode {
    // Constants for code usage - safe pattern without force unwrapping
    static let unknown = "E_UNKNOWN"
    static let serviceError = "E_SERVICE_ERROR"
    static let userCancelled = "E_USER_CANCELLED"
    static let userError = "E_USER_ERROR"
    static let itemUnavailable = "E_ITEM_UNAVAILABLE"
    static let remoteError = "E_REMOTE_ERROR"
    static let networkError = "E_NETWORK_ERROR"
    static let receiptFailed = "E_RECEIPT_FAILED"
    static let receiptFinishedFailed = "E_RECEIPT_FINISHED_FAILED"
    static let notPrepared = "E_NOT_PREPARED"
    static let notEnded = "E_NOT_ENDED"
    static let alreadyOwned = "E_ALREADY_OWNED"
    static let developerError = "E_DEVELOPER_ERROR"
    static let purchaseError = "E_PURCHASE_ERROR"
    static let syncError = "E_SYNC_ERROR"
    static let deferredPayment = "E_DEFERRED_PAYMENT"
    static let transactionValidationFailed = "E_TRANSACTION_VALIDATION_FAILED"
    static let billingResponseJsonParseError = "E_BILLING_RESPONSE_JSON_PARSE_ERROR"
    static let interrupted = "E_INTERRUPTED"
    static let iapNotAvailable = "E_IAP_NOT_AVAILABLE"
    static let activityUnavailable = "E_ACTIVITY_UNAVAILABLE"
    static let alreadyPrepared = "E_ALREADY_PREPARED"
    static let pending = "E_PENDING"
    static let connectionClosed = "E_CONNECTION_CLOSED"
    
    // Convert to dictionary for Constants export - safe pattern without dictionary lookups
    static func toDictionary() -> [String: String] {
        return [
            "E_UNKNOWN": unknown,
            "E_SERVICE_ERROR": serviceError,
            "E_USER_CANCELLED": userCancelled,
            "E_USER_ERROR": userError,
            "E_ITEM_UNAVAILABLE": itemUnavailable,
            "E_REMOTE_ERROR": remoteError,
            "E_NETWORK_ERROR": networkError,
            "E_RECEIPT_FAILED": receiptFailed,
            "E_RECEIPT_FINISHED_FAILED": receiptFinishedFailed,
            "E_NOT_PREPARED": notPrepared,
            "E_NOT_ENDED": notEnded,
            "E_ALREADY_OWNED": alreadyOwned,
            "E_DEVELOPER_ERROR": developerError,
            "E_PURCHASE_ERROR": purchaseError,
            "E_SYNC_ERROR": syncError,
            "E_DEFERRED_PAYMENT": deferredPayment,
            "E_TRANSACTION_VALIDATION_FAILED": transactionValidationFailed,
            "E_BILLING_RESPONSE_JSON_PARSE_ERROR": billingResponseJsonParseError,
            "E_INTERRUPTED": interrupted,
            "E_IAP_NOT_AVAILABLE": iapNotAvailable,
            "E_ACTIVITY_UNAVAILABLE": activityUnavailable,
            "E_ALREADY_PREPARED": alreadyPrepared,
            "E_PENDING": pending,
            "E_CONNECTION_CLOSED": connectionClosed
        ]
    }
}

// Based on https://stackoverflow.com/a/40135192/570612
extension Date {
    var millisecondsSince1970: Int64 {
        return Int64((self.timeIntervalSince1970 * 1000.0).rounded())
    }

    var millisecondsSince1970String: String {
        return String(self.millisecondsSince1970)
    }

    init(milliseconds: Int64) {
        self = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000)
    }
}

extension SKProductsRequest {
    var key: String {
        return String(self.hashValue)
    }
}
