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
    
    // Cached dictionary for Constants export - using constants as keys to avoid duplication
    private static let _cachedDictionary: [String: String] = [
        unknown: unknown,
        serviceError: serviceError,
        userCancelled: userCancelled,
        userError: userError,
        itemUnavailable: itemUnavailable,
        remoteError: remoteError,
        networkError: networkError,
        receiptFailed: receiptFailed,
        receiptFinishedFailed: receiptFinishedFailed,
        notPrepared: notPrepared,
        notEnded: notEnded,
        alreadyOwned: alreadyOwned,
        developerError: developerError,
        purchaseError: purchaseError,
        syncError: syncError,
        deferredPayment: deferredPayment,
        transactionValidationFailed: transactionValidationFailed,
        billingResponseJsonParseError: billingResponseJsonParseError,
        interrupted: interrupted,
        iapNotAvailable: iapNotAvailable,
        activityUnavailable: activityUnavailable,
        alreadyPrepared: alreadyPrepared,
        pending: pending,
        connectionClosed: connectionClosed
    ]
    
    // Return cached dictionary - no allocation on repeated calls
    static func toDictionary() -> [String: String] {
        return _cachedDictionary
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
