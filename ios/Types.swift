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
    private static let codes: [String: String] = [
        "E_UNKNOWN": "E_UNKNOWN",
        "E_SERVICE_ERROR": "E_SERVICE_ERROR",
        "E_USER_CANCELLED": "E_USER_CANCELLED",
        "E_USER_ERROR": "E_USER_ERROR",
        "E_ITEM_UNAVAILABLE": "E_ITEM_UNAVAILABLE",
        "E_REMOTE_ERROR": "E_REMOTE_ERROR",
        "E_NETWORK_ERROR": "E_NETWORK_ERROR",
        "E_RECEIPT_FAILED": "E_RECEIPT_FAILED",
        "E_RECEIPT_FINISHED_FAILED": "E_RECEIPT_FINISHED_FAILED",
        "E_NOT_PREPARED": "E_NOT_PREPARED",
        "E_NOT_ENDED": "E_NOT_ENDED",
        "E_ALREADY_OWNED": "E_ALREADY_OWNED",
        "E_DEVELOPER_ERROR": "E_DEVELOPER_ERROR",
        "E_PURCHASE_ERROR": "E_PURCHASE_ERROR",
        "E_SYNC_ERROR": "E_SYNC_ERROR",
        "E_DEFERRED_PAYMENT": "E_DEFERRED_PAYMENT",
        "E_TRANSACTION_VALIDATION_FAILED": "E_TRANSACTION_VALIDATION_FAILED",
        "E_BILLING_RESPONSE_JSON_PARSE_ERROR": "E_BILLING_RESPONSE_JSON_PARSE_ERROR",
        "E_INTERRUPTED": "E_INTERRUPTED",
        "E_IAP_NOT_AVAILABLE": "E_IAP_NOT_AVAILABLE",
        "E_ACTIVITY_UNAVAILABLE": "E_ACTIVITY_UNAVAILABLE",
        "E_ALREADY_PREPARED": "E_ALREADY_PREPARED",
        "E_PENDING": "E_PENDING",
        "E_CONNECTION_CLOSED": "E_CONNECTION_CLOSED"
    ]
    
    // Constants for code usage
    static let unknown = codes["E_UNKNOWN"]!
    static let serviceError = codes["E_SERVICE_ERROR"]!
    static let userCancelled = codes["E_USER_CANCELLED"]!
    static let userError = codes["E_USER_ERROR"]!
    static let itemUnavailable = codes["E_ITEM_UNAVAILABLE"]!
    static let remoteError = codes["E_REMOTE_ERROR"]!
    static let networkError = codes["E_NETWORK_ERROR"]!
    static let receiptFailed = codes["E_RECEIPT_FAILED"]!
    static let receiptFinishedFailed = codes["E_RECEIPT_FINISHED_FAILED"]!
    static let notPrepared = codes["E_NOT_PREPARED"]!
    static let notEnded = codes["E_NOT_ENDED"]!
    static let alreadyOwned = codes["E_ALREADY_OWNED"]!
    static let developerError = codes["E_DEVELOPER_ERROR"]!
    static let purchaseError = codes["E_PURCHASE_ERROR"]!
    static let syncError = codes["E_SYNC_ERROR"]!
    static let deferredPayment = codes["E_DEFERRED_PAYMENT"]!
    static let transactionValidationFailed = codes["E_TRANSACTION_VALIDATION_FAILED"]!
    static let billingResponseJsonParseError = codes["E_BILLING_RESPONSE_JSON_PARSE_ERROR"]!
    static let interrupted = codes["E_INTERRUPTED"]!
    static let iapNotAvailable = codes["E_IAP_NOT_AVAILABLE"]!
    static let activityUnavailable = codes["E_ACTIVITY_UNAVAILABLE"]!
    static let alreadyPrepared = codes["E_ALREADY_PREPARED"]!
    static let pending = codes["E_PENDING"]!
    static let connectionClosed = codes["E_CONNECTION_CLOSED"]!
    
    // Convert to dictionary for Constants export
    static func toDictionary() -> [String: String] {
        return codes
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
