import ExpoModulesCore
import Foundation
import OpenIAP
#if canImport(UIKit)
import UIKit
#endif

@available(iOS 15.0, tvOS 15.0, *)
@MainActor
public final class ExpoIapModule: Module {
    private var isInitialized = false
    private var purchaseUpdatedSub: Subscription?
    private var purchaseErrorSub: Subscription?
    private var promotedProductSub: Subscription?

    nonisolated public func definition() -> ModuleDefinition {
        Name("ExpoIap")

        Constants {
            OpenIapSerialization.errorCodes()
        }

        Events(
            IapEvent.purchaseUpdated.rawValue,
            IapEvent.purchaseError.rawValue,
            IapEvent.promotedProductIos.rawValue
        )

        OnCreate {
            Task { @MainActor in
                self.setupStore()
            }
        }

        OnDestroy {
            Task { @MainActor in
                await self.cleanupStore()
            }
        }

        AsyncFunction("initConnection") { () async throws -> Bool in
            let isConnected = try await OpenIapModule.shared.initConnection()
            await MainActor.run { self.isInitialized = isConnected }
            return isConnected
        }

        AsyncFunction("endConnection") { () async throws -> Bool in
            _ = try await OpenIapModule.shared.endConnection()
            await MainActor.run { self.isInitialized = false }
            return true
        }

        AsyncFunction("fetchProducts") { (params: [String: Any]) async throws -> [[String: Any]] in
            try await ensureConnection()
            let request = try ExpoIapHelper.decodeProductRequest(from: params)
            let result = try await OpenIapModule.shared.fetchProducts(request)
            return ExpoIapHelper.sanitizeArray(OpenIapSerialization.products(result, logger: ExpoIapLog.debug))
        }

        AsyncFunction("requestPurchase") { (payload: [String: Any]) async throws -> Any? in
            ExpoIapLog.debug("requestPurchase called with payload: \(payload)")
            try await ensureConnection()
            let props = try ExpoIapHelper.decodeRequestPurchaseProps(from: payload)

            do {
                guard let result = try await OpenIapModule.shared.requestPurchase(props) else {
                    return nil
                }

                switch result {
                case .purchase(let maybePurchase):
                    guard let purchase = maybePurchase else { return nil }
                    return ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.purchase(purchase))
                case .purchases(let maybePurchases):
                    guard let purchases = maybePurchases else { return nil }
                    return ExpoIapHelper.sanitizeArray(OpenIapSerialization.purchases(purchases))
                }
            } catch let error as PurchaseError {
                throw error
            } catch {
                throw PurchaseError.make(code: .purchaseError, message: error.localizedDescription)
            }
        }

        AsyncFunction("finishTransaction") {
            (purchasePayload: [String: Any], isConsumable: Bool?) async throws -> Bool in
            try await ensureConnection()
            let purchaseInput = try OpenIapSerialization.purchaseInput(from: purchasePayload)
            try await OpenIapModule.shared.finishTransaction(
                purchase: purchaseInput,
                isConsumable: isConsumable
            )
            return true
        }

        AsyncFunction("getAvailablePurchases") {
            (options: [String: Any]?) async throws -> [[String: Any]] in
            try await ensureConnection()
            let purchaseOptions = try options.map { try OpenIapSerialization.purchaseOptions(from: $0) }
            let purchases = try await OpenIapModule.shared.getAvailablePurchases(purchaseOptions)
            return ExpoIapHelper.sanitizeArray(OpenIapSerialization.purchases(purchases))
        }

        AsyncFunction("getAvailableItems") {
            (alsoPublish: Bool, onlyIncludeActive: Bool) async throws -> [[String: Any]] in
            try await ensureConnection()
            let optionsDictionary: [String: Any] = [
                "alsoPublishToEventListenerIOS": alsoPublish,
                "onlyIncludeActiveItemsIOS": onlyIncludeActive
            ]
            let options = try OpenIapSerialization.purchaseOptions(from: optionsDictionary)
            let purchases = try await OpenIapModule.shared.getAvailablePurchases(options)
            return ExpoIapHelper.sanitizeArray(OpenIapSerialization.purchases(purchases))
        }

        AsyncFunction("getPendingTransactionsIOS") { () async throws -> [[String: Any]] in
            try await ensureConnection()
            let pending = try await OpenIapModule.shared.getPendingTransactionsIOS()
            return pending.map { ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode($0)) }
        }

        AsyncFunction("clearTransactionIOS") { () async throws -> Bool in
            try await ensureConnection()
            _ = try await OpenIapModule.shared.clearTransactionIOS()
            return true
        }

        AsyncFunction("getReceiptIOS") { () async throws -> String in
            try await ensureConnection()
            return try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
        }

        AsyncFunction("getReceiptDataIOS") { () async throws -> String in
            try await ensureConnection()
            return try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
        }

        AsyncFunction("requestReceiptRefreshIOS") { () async throws -> String in
            try await ensureConnection()
            return try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
        }

        AsyncFunction("validateReceiptIOS") { (sku: String) async throws -> [String: Any] in
            try await ensureConnection()
            do {
                let props = try OpenIapSerialization.receiptValidationProps(from: ["sku": sku])
                let result = try await OpenIapModule.shared.validateReceiptIOS(props)
                var payload = OpenIapSerialization.encode(result)
                payload["purchaseToken"] = result.jwsRepresentation
                return ExpoIapHelper.sanitizeDictionary(payload)
            } catch let error as PurchaseError {
                throw error
            } catch {
                throw PurchaseError.make(code: .receiptFailed)
            }
        }

        AsyncFunction("presentCodeRedemptionSheetIOS") { () async throws -> Bool in
            try await ensureConnection()
            return try await OpenIapModule.shared.presentCodeRedemptionSheetIOS()
        }

        AsyncFunction("showManageSubscriptionsIOS") { () async throws -> [[String: Any]] in
            try await ensureConnection()
            let purchases = try await OpenIapModule.shared.showManageSubscriptionsIOS()
            return purchases.map { ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode($0)) }
        }

        AsyncFunction("deepLinkToSubscriptionsIOS") { () async throws -> Bool in
            try await ensureConnection()
            try await OpenIapModule.shared.deepLinkToSubscriptions(nil)
            return true
        }

        AsyncFunction("beginRefundRequestIOS") { (sku: String) async throws -> String? in
            try await ensureConnection()
            return try await OpenIapModule.shared.beginRefundRequestIOS(sku: sku)
        }

        AsyncFunction("getPromotedProductIOS") { () async throws -> [String: Any]? in
            try await ensureConnection()
            if let product = try await OpenIapModule.shared.getPromotedProductIOS() {
                return ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(product))
            }
            return nil
        }

        AsyncFunction("getStorefrontIOS") { () async throws -> String in
            try await ensureConnection()
            return try await OpenIapModule.shared.getStorefrontIOS()
        }

        AsyncFunction("syncIOS") { () async throws -> Bool in
            try await ensureConnection()
            return try await OpenIapModule.shared.syncIOS()
        }

        AsyncFunction("isTransactionVerifiedIOS") { (sku: String) async throws -> Bool in
            try await ensureConnection()
            return try await OpenIapModule.shared.isTransactionVerifiedIOS(sku: sku)
        }

        AsyncFunction("getTransactionJwsIOS") { (sku: String) async throws -> String? in
            try await ensureConnection()
            return try await OpenIapModule.shared.getTransactionJwsIOS(sku: sku)
        }

        AsyncFunction("isEligibleForIntroOfferIOS") { (groupID: String) async throws -> Bool in
            try await ensureConnection()
            return try await OpenIapModule.shared.isEligibleForIntroOfferIOS(groupID: groupID)
        }

        AsyncFunction("subscriptionStatusIOS") { (sku: String) async throws -> [[String: Any]]? in
            try await ensureConnection()
            let statuses = try await OpenIapModule.shared.subscriptionStatusIOS(sku: sku)
            return statuses.map { ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode($0)) }
        }

        AsyncFunction("currentEntitlementIOS") { (sku: String) async throws -> [String: Any]? in
            try await ensureConnection()
            do {
                if let entitlement = try await OpenIapModule.shared.currentEntitlementIOS(sku: sku) {
                    return ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(entitlement))
                }
                return nil
            } catch let error as PurchaseError {
                throw error
            } catch {
                throw PurchaseError.make(code: .skuNotFound, productId: sku)
            }
        }

        AsyncFunction("latestTransactionIOS") { (sku: String) async throws -> [String: Any]? in
            try await ensureConnection()
            do {
                if let transaction = try await OpenIapModule.shared.latestTransactionIOS(sku: sku) {
                    return ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(transaction))
                }
                return nil
            } catch let error as PurchaseError {
                throw error
            } catch {
                throw PurchaseError.make(code: .skuNotFound, productId: sku)
            }
        }
    }

    @MainActor
    private func setupStore() {
        purchaseUpdatedSub = OpenIapModule.shared.purchaseUpdatedListener { [weak self] purchase in
            Task { @MainActor in
                guard let self else { return }
                let payload = ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.purchase(purchase))
                self.sendEvent(IapEvent.purchaseUpdated.rawValue, payload)
            }
        }

        purchaseErrorSub = OpenIapModule.shared.purchaseErrorListener { [weak self] error in
            Task { @MainActor in
                guard let self else { return }
                let payload = ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(error))
                self.sendEvent(IapEvent.purchaseError.rawValue, payload)
            }
        }

        promotedProductSub = OpenIapModule.shared.promotedProductListenerIOS { [weak self] productId in
            Task { @MainActor in
                guard let self else { return }
                self.sendEvent(IapEvent.promotedProductIos.rawValue, ["productId": productId])
            }
        }
    }

    @MainActor
    private func cleanupStore() async {
        removeListener(&purchaseUpdatedSub)
        removeListener(&purchaseErrorSub)
        removeListener(&promotedProductSub)
        _ = try? await OpenIapModule.shared.endConnection()
    }

    private func removeListener(_ subscription: inout Subscription?) {
        if let current = subscription {
            OpenIapModule.shared.removeListener(current)
        }
        subscription = nil
    }

    private func ensureConnection() async throws {
        try await MainActor.run {
            guard self.isInitialized else {
                throw PurchaseError.make(
                    code: .initConnection,
                    message: "Connection not initialized. Call initConnection() first."
                )
            }
        }
    }
}
