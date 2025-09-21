import ExpoModulesCore
import Foundation
import OpenIAP

private enum OnsideEvent: String {
    case purchaseUpdated = "purchase-updated"
    case purchaseError = "purchase-error"
    case promotedProductIOS = "promoted-product-ios"
}

private enum OneSideBridgeError: Error, LocalizedError {
    case sdkUnavailable
    case notInitialized
    case emptySkuList
    case productNotFound(String)
    case transactionNotFound(String)
    case restoreInProgress
    case queueError(String)

    var errorDescription: String? {
        switch self {
        case .sdkUnavailable:
            return "OnsideKit is not installed. Enable ios.onside.enabled to use this functionality."
        case .notInitialized:
            return "Connection not initialized. Call initConnection() first."
        case .emptySkuList:
            return "No product identifiers provided."
        case .productNotFound(let sku):
            return "Product with identifier \(sku) was not fetched. Call fetchProducts() first."
        case .transactionNotFound(let id):
            return "Could not locate transaction with id \(id)."
        case .restoreInProgress:
            return "A restore operation is already in progress."
        case .queueError(let message):
            return message
        }
    }
}

#if canImport(OnsideKit)
import OnsideKit

@available(iOS 16.0, *)
@MainActor
public final class OneSideModule: Module {
    private var isInitialized = false
    private var restoreContinuation: CheckedContinuation<Bool, Error>?
    private let transactionObserver = OnsideTransactionObserverBridge()
    private let productFetcher = OnsideProductFetcher()
    private var productCache: [String: OnsideProduct] = [:]
    private var transactionCache: [UUID: OnsidePaymentTransaction] = [:]

    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .millisecondsSince1970
        return encoder
    }()

    nonisolated public func definition() -> ModuleDefinition {
        Name("ExpoIapOnside")

        Constants {
            OpenIapSerialization.errorCodes()
        }

        Events(
            OnsideEvent.purchaseUpdated.rawValue,
            OnsideEvent.purchaseError.rawValue,
            OnsideEvent.promotedProductIOS.rawValue
        )

        OnCreate {
            Task { @MainActor in
                self.configureObserverCallbacks()
            }
        }

        OnDestroy {
            Task { @MainActor in
                self.cleanup()
            }
        }

        AsyncFunction("initConnection") { () async throws -> Bool in
            ExpoIapLog.payload("initConnectionOnside", payload: nil)
            try await ensureObserverRegistered()
            return true
        }

        AsyncFunction("endConnection") { () async throws -> Bool in
            ExpoIapLog.payload("endConnectionOnside", payload: nil)
            cleanup()
            return true
        }

        AsyncFunction("fetchProducts") { (params: [String: Any]) async throws -> [[String: Any]] in
            ExpoIapLog.payload("fetchProductsOnside", payload: params)
            try await ensureObserverRegistered()

            let request = try ExpoIapHelper.decodeProductRequest(from: params)
            guard !request.skus.isEmpty else {
                throw OneSideBridgeError.emptySkuList
            }

            let response = try await productFetcher.fetch(identifiers: Set(request.skus))

            if !response.invalidProductIdentifiers.isEmpty {
                throw OneSideBridgeError.productNotFound(response.invalidProductIdentifiers.joined(separator: ", "))
            }

            response.products.forEach { productCache[$0.productIdentifier] = $0 }

            let payload = try response.products.map { try serializeProduct($0) }
            ExpoIapLog.result("fetchProductsOnside", value: payload)
            return payload
        }

        AsyncFunction("requestPurchase") { (payload: [String: Any]) async throws -> Any? in
            ExpoIapLog.payload("requestPurchaseOnside", payload: payload)
            try await ensureObserverRegistered()

            guard let sku = resolveSku(from: payload) else {
                throw OneSideBridgeError.emptySkuList
            }

            try await ensureProductAvailable(sku: sku)
            guard let product = productCache[sku] else {
                throw OneSideBridgeError.productNotFound(sku)
            }

            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                Onside.paymentQueue().add(product) { result in
                    switch result {
                    case .success:
                        continuation.resume()
                    case .failure(let error):
                        continuation.resume(throwing: OneSideBridgeError.queueError(error.localizedDescription))
                    }
                }
            }

            ExpoIapLog.result("requestPurchaseOnside", value: nil as Any?)
            return nil
        }

        AsyncFunction("finishTransaction") {
            (purchasePayload: [String: Any], _: Bool?) async throws -> Bool in
                ExpoIapLog.payload("finishTransactionOnside", payload: purchasePayload)
                try await ensureObserverRegistered()

                guard let transactionId = purchasePayload["transactionId"] as? String,
                      let uuid = UUID(uuidString: transactionId),
                      let transaction = transactionCache[uuid] else {
                    throw OneSideBridgeError.transactionNotFound(purchasePayload["transactionId"] as? String ?? "")
                }

                Onside.paymentQueue().finishTransaction(transaction)
                transactionCache.removeValue(forKey: uuid)
                ExpoIapLog.result("finishTransactionOnside", value: true)
                return true
        }

        AsyncFunction("restorePurchases") { () async throws -> Bool in
            ExpoIapLog.payload("restorePurchasesOnside", payload: nil)
            try await ensureObserverRegistered()

            if restoreContinuation != nil {
                throw OneSideBridgeError.restoreInProgress
            }

            return try await withCheckedThrowingContinuation { continuation in
                restoreContinuation = continuation
                Onside.paymentQueue().restoreCompletedTransactions { [weak self] result in
                    guard let self else {
                        continuation.resume(returning: true)
                        return
                    }
                    switch result {
                    case .success:
                        continuation.resume(returning: true)
                    case .failure(let error):
                        continuation.resume(throwing: OneSideBridgeError.queueError(error.localizedDescription))
                    }
                    restoreContinuation = nil
                }
            }
        }

        AsyncFunction("getStorefrontIOS") { () async throws -> String in
            ExpoIapLog.payload("getStorefrontOnside", payload: nil)
            try await ensureObserverRegistered()
            let storefront = Onside.paymentQueue().storefront?.countryCode ?? ""
            ExpoIapLog.result("getStorefrontOnside", value: storefront)
            return storefront
        }
    }

    private func ensureObserverRegistered() async throws {
        if !isInitialized {
            Onside.paymentQueue().add(observer: transactionObserver)
            isInitialized = true
        }
    }

    private func ensureProductAvailable(sku: String) async throws {
        if productCache[sku] != nil {
            return
        }
        let response = try await productFetcher.fetch(identifiers: [sku])
        if !response.invalidProductIdentifiers.isEmpty {
            throw OneSideBridgeError.productNotFound(sku)
        }
        response.products.forEach { productCache[$0.productIdentifier] = $0 }
    }

    private func configureObserverCallbacks() {
        transactionObserver.onTransactionsUpdated = { [weak self] transactions in
            guard let self else { return }
            transactions.forEach { transaction in
                transactionCache[transaction.id] = transaction
                handle(transaction: transaction)
            }
        }

        transactionObserver.onRestoreFinished = { [weak self] in
            guard let self else { return }
            restoreContinuation?.resume(returning: true)
            restoreContinuation = nil
        }

        transactionObserver.onRestoreFailed = { [weak self] error in
            guard let self else { return }
            restoreContinuation?.resume(throwing: OneSideBridgeError.queueError(error.localizedDescription))
            restoreContinuation = nil
        }
    }

    private func cleanup() {
        if isInitialized {
            Onside.paymentQueue().remove(observer: transactionObserver)
            isInitialized = false
        }
        transactionCache.removeAll()
        restoreContinuation?.resume(returning: false)
        restoreContinuation = nil
    }

    private func handle(transaction: OnsidePaymentTransaction) {
        do {
            let payload = try serialize(transaction: transaction)
            switch transaction.transactionState {
            case .purchased, .restored:
                sendEvent(OnsideEvent.purchaseUpdated.rawValue, payload)
            case .failed:
                let errorPayload: [String: Any] = [
                    "code": ErrorCode.PurchaseError.rawValue,
                    "message": (transaction.error?.localizedDescription ?? "Purchase failed"),
                    "productId": transaction.product.productIdentifier
                ]
                sendEvent(OnsideEvent.purchaseError.rawValue, errorPayload)
            case .purchasing:
                break
            @unknown default:
                break
            }
        } catch {
            ExpoIapLog.failure("handleTransactionOnside", error: error)
        }
    }

    private func serializeProduct(_ product: OnsideProduct) throws -> [String: Any] {
        var dictionary: [String: Any?] = [:]
        dictionary["id"] = product.productIdentifier
        dictionary["platform"] = "ios"
        dictionary["title"] = product.localizedTitle
        dictionary["description"] = product.localizedDescription
        dictionary["displayName"] = product.localizedTitle
        dictionary["displayNameIOS"] = product.localizedTitle
        dictionary["displayPrice"] = product.price.formatted
        dictionary["currency"] = product.price.currencyCode
        dictionary["price"] = product.price.value
        dictionary["type"] = "in-app"
        dictionary["typeIOS"] = "non-consumable"
        dictionary["isFamilyShareableIOS"] = false
        dictionary["jsonRepresentationIOS"] = try encodeToJSONString(product)
        dictionary["debugDescription"] = product.description
        return sanitize(dictionary)
    }

    private func serialize(transaction: OnsidePaymentTransaction) throws -> [String: Any] {
        let product = transaction.product
        var dictionary: [String: Any?] = [:]
        dictionary["id"] = transaction.id.uuidString
        dictionary["transactionId"] = transaction.id.uuidString
        dictionary["productId"] = product.productIdentifier
        dictionary["platform"] = "ios"
        dictionary["quantity"] = 1
        dictionary["isAutoRenewing"] = false
        dictionary["purchaseState"] = mapPurchaseState(transaction.transactionState)
        dictionary["transactionDate"] = Int(Date().timeIntervalSince1970 * 1000)
        dictionary["currencyCodeIOS"] = product.price.currencyCode
        dictionary["currencySymbolIOS"] = product.price.formatted
        dictionary["storefrontCountryCodeIOS"] = transaction.storefront.countryCode
        dictionary["purchaseToken"] = nil
        dictionary["environmentIOS"] = transaction.storefront.id
        if let error = transaction.error {
            dictionary["reasonIOS"] = error.localizedDescription
        }
        return sanitize(dictionary)
    }

    private func encodeToJSONString<T: Encodable>(_ value: T) throws -> String {
        let data = try encoder.encode(value)
        guard let json = String(data: data, encoding: .utf8) else {
            throw OneSideBridgeError.queueError("Unable to encode JSON string")
        }
        return json
    }

    private func sanitize(_ dictionary: [String: Any?]) -> [String: Any] {
        var result: [String: Any] = [:]
        for (key, value) in dictionary {
            if let value {
                result[key] = value
            }
        }
        return result
    }

    private func mapPurchaseState(_ state: OnsidePaymentTransactionState) -> String {
        switch state {
        case .purchased:
            return "purchased"
        case .restored:
            return "restored"
        case .failed:
            return "failed"
        case .purchasing:
            return "pending"
        @unknown default:
            return "unknown"
        }
    }

    private func resolveSku(from payload: [String: Any]) -> String? {
        if let sku = payload["sku"] as? String, !sku.isEmpty {
            return sku
        }

        if let request = payload["request"] as? [String: Any] {
            if let ios = request["ios"] as? [String: Any] {
                if let sku = ios["sku"] as? String, !sku.isEmpty {
                    return sku
                }
                if let skus = ios["skus"] as? [String], let first = skus.first, !first.isEmpty {
                    return first
                }
            }
        }

        if let requestPurchase = payload["requestPurchase"] as? [String: Any],
           let ios = requestPurchase["ios"] as? [String: Any],
           let sku = ios["sku"] as? String, !sku.isEmpty {
            return sku
        }

        if let requestSubscription = payload["requestSubscription"] as? [String: Any],
           let ios = requestSubscription["ios"] as? [String: Any],
           let sku = ios["sku"] as? String, !sku.isEmpty {
            return sku
        }

        if let skus = payload["skus"] as? [String], let first = skus.first, !first.isEmpty {
            return first
        }

        return nil
    }
}

@available(iOS 16.0, *)
private final class OnsideTransactionObserverBridge: NSObject, OnsidePaymentTransactionObserver {
    var onTransactionsUpdated: (([OnsidePaymentTransaction]) -> Void)?
    var onRestoreFinished: (() -> Void)?
    var onRestoreFailed: ((OnsideTransactionsRestoreError) -> Void)?

    func onsidePaymentQueue(_ queue: OnsidePaymentQueue, updatedTransactions transactions: [OnsidePaymentTransaction]) {
        onTransactionsUpdated?(transactions)
    }

    func onsidePaymentQueue(_ queue: OnsidePaymentQueue, removedTransactions: [OnsidePaymentTransaction]) {}

    func onsidePaymentQueueRestoreCompletedTransactionsFinished(_ queue: OnsidePaymentQueue) {
        onRestoreFinished?()
    }

    func onsidePaymentQueue(_ queue: OnsidePaymentQueue, restoreCompletedTransactionsFailedWithError error: OnsideTransactionsRestoreError) {
        onRestoreFailed?(error)
    }

    func onsidePaymentQueueDidChangeStorefront(_ queue: OnsidePaymentQueue) {}
}

@available(iOS 16.0, *)
private final class OnsideProductFetcher: NSObject, OnsideProductsRequestDelegate {
    private var continuation: CheckedContinuation<OnsideProductsResponse, Error>?
    private var request: OnsideProductsRequest?

    func fetch(identifiers: Set<String>) async throws -> OnsideProductsResponse {
        guard !identifiers.isEmpty else {
            throw OneSideBridgeError.emptySkuList
        }

        return try await withCheckedThrowingContinuation { continuation in
            let request = Onside.makeProductsRequest(productIdentifiers: identifiers)
            self.request = request
            self.continuation = continuation
            request.delegate = self
            request.start()
        }
    }

    func onsideProductsRequest(_ request: OnsideProductsRequest, didReceive response: OnsideProductsResponse) {
        continuation?.resume(returning: response)
        cleanup()
    }

    func onsideProductsRequestRequest(_ request: OnsideProductsRequest, didFailWithError error: OnsideProductsRequestError) {
        continuation?.resume(throwing: OneSideBridgeError.queueError(error.localizedDescription))
        cleanup()
    }

    func onsideProductsRequestDidFinish(_ request: OnsideProductsRequest) {
        cleanup()
    }

    private func cleanup() {
        request?.delegate = nil
        request?.stop()
        request = nil
        continuation = nil
    }
}

#else

@available(iOS 15.0, tvOS 15.0, *)
@MainActor
public final class OneSideModule: Module {
    nonisolated public func definition() -> ModuleDefinition {
        Name("ExpoIapOnside")

        Events(
            OnsideEvent.purchaseUpdated.rawValue,
            OnsideEvent.purchaseError.rawValue,
            OnsideEvent.promotedProductIOS.rawValue
        )

        AsyncFunction("initConnection") { () async throws -> Bool in
            throw OneSideBridgeError.sdkUnavailable
        }

        AsyncFunction("endConnection") { () async throws -> Bool in
            throw OneSideBridgeError.sdkUnavailable
        }

        AsyncFunction("fetchProducts") { (_: [String: Any]) async throws -> [[String: Any]] in
            throw OneSideBridgeError.sdkUnavailable
        }

        AsyncFunction("requestPurchase") { (_: [String: Any]) async throws -> Any? in
            throw OneSideBridgeError.sdkUnavailable
        }

        AsyncFunction("finishTransaction") { (_: [String: Any], _: Bool?) async throws -> Bool in
            throw OneSideBridgeError.sdkUnavailable
        }

        AsyncFunction("restorePurchases") { () async throws -> Bool in
            throw OneSideBridgeError.sdkUnavailable
        }

        AsyncFunction("getStorefrontIOS") { () async throws -> String in
            throw OneSideBridgeError.sdkUnavailable
        }
    }
}

#endif
