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

    nonisolated public func definition() -> ModuleDefinition {
        Name("ExpoIap")

        Constants([
            "ERROR_CODES": OpenIapSerialization.errorCodes()
        ])

        Events(
            OpenIapEvent.purchaseUpdated.rawValue,
            OpenIapEvent.purchaseError.rawValue,
            OpenIapEvent.promotedProductIos.rawValue
        )

        OnCreate {
            Task { @MainActor in
                ExpoIapHelper.setupStore(module: self)
            }
        }

        OnDestroy {
            Task { @MainActor in
                await ExpoIapHelper.cleanupStore()
            }
        }

        AsyncFunction("initConnection") { (config: [String: Any]?) async throws -> Bool in
            // Note: iOS doesn't support alternative billing config parameter
            // Config is ignored on iOS platform
            let isConnected = try await OpenIapModule.shared.initConnection()
            await MainActor.run { self.isInitialized = isConnected }
            return isConnected
        }

        AsyncFunction("endConnection") { () async throws -> Bool in
            let succeeded = try await OpenIapModule.shared.endConnection()
            await MainActor.run { self.isInitialized = false }
            return succeeded
        }

        AsyncFunction("fetchProducts") { (params: [String: Any]) async throws -> [[String: Any]] in
            ExpoIapLog.payload("fetchProducts", payload: params)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let request = try ExpoIapHelper.decodeProductRequest(from: params)
            let result = try await OpenIapModule.shared.fetchProducts(request)
            let products = ExpoIapHelper.sanitizeArray(OpenIapSerialization.products(result))
            ExpoIapLog.result("fetchProducts", value: products)
            return products
        }

        AsyncFunction("requestPurchase") { (payload: [String: Any]) async throws -> Any? in
            ExpoIapLog.payload("requestPurchase", payload: payload)
            print("🔍 [ExpoIap] Raw payload useAlternativeBilling: \(payload["useAlternativeBilling"] ?? "nil")")
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let props = try ExpoIapHelper.decodeRequestPurchaseProps(from: payload)
            print("🔍 [ExpoIap] Decoded props useAlternativeBilling: \(props.useAlternativeBilling ?? false)")

            do {
                guard let result = try await OpenIapModule.shared.requestPurchase(props) else {
                    ExpoIapLog.result("requestPurchase", value: nil)
                    return nil
                }

                switch result {
                case .purchase(let maybePurchase):
                    guard let purchase = maybePurchase else { return nil }
                    let sanitized = ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.purchase(purchase))
                    ExpoIapLog.result("requestPurchase", value: sanitized)
                    return sanitized
                case .purchases(let maybePurchases):
                    guard let purchases = maybePurchases else { return nil }
                    let sanitized = ExpoIapHelper.sanitizeArray(OpenIapSerialization.purchases(purchases))
                    ExpoIapLog.result("requestPurchase", value: sanitized)
                    return sanitized
                }
            } catch let error as PurchaseError {
                ExpoIapLog.failure("requestPurchase", error: error)
                throw error
            } catch {
                ExpoIapLog.failure("requestPurchase", error: error)
                throw PurchaseError.make(code: .purchaseError, message: error.localizedDescription)
            }
        }

        AsyncFunction("finishTransaction") {
            (purchasePayload: [String: Any], isConsumable: Bool?) async throws -> Bool in
            ExpoIapLog.payload(
                "finishTransaction",
                payload: [
                    "purchase": purchasePayload,
                    "isConsumable": isConsumable as Any,
                ]
            )
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let purchaseInput = try OpenIapSerialization.purchaseInput(from: purchasePayload)
            try await OpenIapModule.shared.finishTransaction(
                purchase: purchaseInput,
                isConsumable: isConsumable
            )
            ExpoIapLog.result("finishTransaction", value: true)
            return true
        }

        AsyncFunction("getAvailablePurchases") {
            (options: [String: Any]?) async throws -> [[String: Any]] in
            ExpoIapLog.payload("getAvailablePurchases", payload: options ?? [:])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let purchaseOptions = try options.map { try OpenIapSerialization.purchaseOptions(from: $0) }
            let purchases = try await OpenIapModule.shared.getAvailablePurchases(purchaseOptions)
            let sanitized = ExpoIapHelper.sanitizeArray(OpenIapSerialization.purchases(purchases))
            ExpoIapLog.result("getAvailablePurchases", value: sanitized)
            return sanitized
        }

        AsyncFunction("getAvailableItems") {
            (alsoPublish: Bool, onlyIncludeActive: Bool) async throws -> [[String: Any]] in
            ExpoIapLog.payload(
                "getAvailableItems",
                payload: [
                    "alsoPublishToEventListenerIOS": alsoPublish,
                    "onlyIncludeActiveItemsIOS": onlyIncludeActive,
                ]
            )
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let optionsDictionary: [String: Any] = [
                "alsoPublishToEventListenerIOS": alsoPublish,
                "onlyIncludeActiveItemsIOS": onlyIncludeActive
            ]
            let options = try OpenIapSerialization.purchaseOptions(from: optionsDictionary)
            let purchases = try await OpenIapModule.shared.getAvailablePurchases(options)
            let sanitized = ExpoIapHelper.sanitizeArray(OpenIapSerialization.purchases(purchases))
            ExpoIapLog.result("getAvailableItems", value: sanitized)
            return sanitized
        }

        AsyncFunction("getPendingTransactionsIOS") { () async throws -> [[String: Any]] in
            ExpoIapLog.payload("getPendingTransactionsIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let pending = try await OpenIapModule.shared.getPendingTransactionsIOS()
            let sanitized = pending.map { ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode($0)) }
            ExpoIapLog.result("getPendingTransactionsIOS", value: sanitized)
            return sanitized
        }

        AsyncFunction("clearTransactionIOS") { () async throws -> Bool in
            ExpoIapLog.payload("clearTransactionIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let success = try await OpenIapModule.shared.clearTransactionIOS()
            ExpoIapLog.result("clearTransactionIOS", value: success)
            return success
        }

        AsyncFunction("getReceiptIOS") { () async throws -> String in
            ExpoIapLog.payload("getReceiptIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let receipt = try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
            ExpoIapLog.result("getReceiptIOS", value: receipt)
            return receipt
        }

        AsyncFunction("getReceiptDataIOS") { () async throws -> String in
            ExpoIapLog.payload("getReceiptDataIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let receipt = try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
            ExpoIapLog.result("getReceiptDataIOS", value: receipt)
            return receipt
        }

        AsyncFunction("requestReceiptRefreshIOS") { () async throws -> String in
            ExpoIapLog.payload("requestReceiptRefreshIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let receipt = try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
            ExpoIapLog.result("requestReceiptRefreshIOS", value: receipt)
            return receipt
        }

        AsyncFunction("validateReceiptIOS") { (sku: String) async throws -> [String: Any] in
            ExpoIapLog.payload("validateReceiptIOS", payload: ["sku": sku])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            do {
                let props = try OpenIapSerialization.receiptValidationProps(from: ["sku": sku])
                let result = try await OpenIapModule.shared.validateReceiptIOS(props)
                var payload = OpenIapSerialization.encode(result)
                payload["purchaseToken"] = result.jwsRepresentation
                let sanitized = ExpoIapHelper.sanitizeDictionary(payload)
                ExpoIapLog.result("validateReceiptIOS", value: sanitized)
                return sanitized
            } catch let error as PurchaseError {
                ExpoIapLog.failure("validateReceiptIOS", error: error)
                throw error
            } catch {
                ExpoIapLog.failure("validateReceiptIOS", error: error)
                throw PurchaseError.make(code: .receiptFailed)
            }
        }

        AsyncFunction("presentCodeRedemptionSheetIOS") { () async throws -> Bool in
            ExpoIapLog.payload("presentCodeRedemptionSheetIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let success = try await OpenIapModule.shared.presentCodeRedemptionSheetIOS()
            ExpoIapLog.result("presentCodeRedemptionSheetIOS", value: success)
            return success
        }

        AsyncFunction("showManageSubscriptionsIOS") { () async throws -> [[String: Any]] in
            ExpoIapLog.payload("showManageSubscriptionsIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let purchases = try await OpenIapModule.shared.showManageSubscriptionsIOS()
            let sanitized = purchases.map { ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode($0)) }
            ExpoIapLog.result("showManageSubscriptionsIOS", value: sanitized)
            return sanitized
        }

        AsyncFunction("deepLinkToSubscriptionsIOS") { () async throws -> Bool in
            ExpoIapLog.payload("deepLinkToSubscriptionsIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            try await OpenIapModule.shared.deepLinkToSubscriptions(nil)
            ExpoIapLog.result("deepLinkToSubscriptionsIOS", value: true)
            return true
        }

        AsyncFunction("beginRefundRequestIOS") { (sku: String) async throws -> String? in
            ExpoIapLog.payload("beginRefundRequestIOS", payload: ["sku": sku])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let result = try await OpenIapModule.shared.beginRefundRequestIOS(sku: sku)
            ExpoIapLog.result("beginRefundRequestIOS", value: result)
            return result
        }

        AsyncFunction("getPromotedProductIOS") { () async throws -> [String: Any]? in
            ExpoIapLog.payload("getPromotedProductIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            if let product = try await OpenIapModule.shared.getPromotedProductIOS() {
                let sanitized = ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(product))
                ExpoIapLog.result("getPromotedProductIOS", value: sanitized)
                return sanitized
            }
            ExpoIapLog.result("getPromotedProductIOS", value: nil)
            return nil
        }

        AsyncFunction("getStorefront") { () async throws -> String in
            ExpoIapLog.payload("getStorefront", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let storefront = try await OpenIapModule.shared.getStorefrontIOS()
            ExpoIapLog.result("getStorefront", value: storefront)
            return storefront
        }

        AsyncFunction("syncIOS") { () async throws -> Bool in
            ExpoIapLog.payload("syncIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let success = try await OpenIapModule.shared.syncIOS()
            ExpoIapLog.result("syncIOS", value: success)
            return success
        }

        AsyncFunction("isTransactionVerifiedIOS") { (sku: String) async throws -> Bool in
            ExpoIapLog.payload("isTransactionVerifiedIOS", payload: ["sku": sku])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let verified = try await OpenIapModule.shared.isTransactionVerifiedIOS(sku: sku)
            ExpoIapLog.result("isTransactionVerifiedIOS", value: verified)
            return verified
        }

        AsyncFunction("getTransactionJwsIOS") { (sku: String) async throws -> String? in
            ExpoIapLog.payload("getTransactionJwsIOS", payload: ["sku": sku])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let jws = try await OpenIapModule.shared.getTransactionJwsIOS(sku: sku)
            ExpoIapLog.result("getTransactionJwsIOS", value: jws)
            return jws
        }

        AsyncFunction("isEligibleForIntroOfferIOS") { (groupID: String) async throws -> Bool in
            ExpoIapLog.payload("isEligibleForIntroOfferIOS", payload: ["groupID": groupID])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let eligible = try await OpenIapModule.shared.isEligibleForIntroOfferIOS(groupID: groupID)
            ExpoIapLog.result("isEligibleForIntroOfferIOS", value: eligible)
            return eligible
        }

        AsyncFunction("subscriptionStatusIOS") { (sku: String) async throws -> [[String: Any]]? in
            ExpoIapLog.payload("subscriptionStatusIOS", payload: ["sku": sku])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let statuses = try await OpenIapModule.shared.subscriptionStatusIOS(sku: sku)
            let sanitized = statuses.map { ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode($0)) }
            ExpoIapLog.result("subscriptionStatusIOS", value: sanitized)
            return sanitized
        }

        AsyncFunction("currentEntitlementIOS") { (sku: String) async throws -> [String: Any]? in
            ExpoIapLog.payload("currentEntitlementIOS", payload: ["sku": sku])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            do {
                if let entitlement = try await OpenIapModule.shared.currentEntitlementIOS(sku: sku) {
                    let sanitized = ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(entitlement))
                    ExpoIapLog.result("currentEntitlementIOS", value: sanitized)
                    return sanitized
                }
                ExpoIapLog.result("currentEntitlementIOS", value: nil)
                return nil
            } catch let error as PurchaseError {
                ExpoIapLog.failure("currentEntitlementIOS", error: error)
                throw error
            } catch {
                ExpoIapLog.failure("currentEntitlementIOS", error: error)
                throw PurchaseError.make(code: .skuNotFound, productId: sku)
            }
        }

        AsyncFunction("latestTransactionIOS") { (sku: String) async throws -> [String: Any]? in
            ExpoIapLog.payload("latestTransactionIOS", payload: ["sku": sku])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            do {
                if let transaction = try await OpenIapModule.shared.latestTransactionIOS(sku: sku) {
                    let sanitized = ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(transaction))
                    ExpoIapLog.result("latestTransactionIOS", value: sanitized)
                    return sanitized
                }
                ExpoIapLog.result("latestTransactionIOS", value: nil)
                return nil
            } catch let error as PurchaseError {
                ExpoIapLog.failure("latestTransactionIOS", error: error)
                throw error
            } catch {
                ExpoIapLog.failure("latestTransactionIOS", error: error)
                throw PurchaseError.make(code: .skuNotFound, productId: sku)
            }
        }

        AsyncFunction("getActiveSubscriptions") { (subscriptionIds: [String]?) async throws -> [[String: Any]] in
            ExpoIapLog.payload("getActiveSubscriptions", payload: subscriptionIds.map { ["subscriptionIds": $0] } ?? [:])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let subscriptions = try await OpenIapModule.shared.getActiveSubscriptions(subscriptionIds)
            let sanitized = subscriptions.map { ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode($0)) }
            ExpoIapLog.result("getActiveSubscriptions", value: sanitized)
            return sanitized
        }

        AsyncFunction("hasActiveSubscriptions") { (subscriptionIds: [String]?) async throws -> Bool in
            ExpoIapLog.payload("hasActiveSubscriptions", payload: subscriptionIds.map { ["subscriptionIds": $0] } ?? [:])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let hasActive = try await OpenIapModule.shared.hasActiveSubscriptions(subscriptionIds)
            ExpoIapLog.result("hasActiveSubscriptions", value: hasActive)
            return hasActive
        }

        // MARK: - External Purchase (iOS 16.0+)

        AsyncFunction("canPresentExternalPurchaseNoticeIOS") { () async throws -> Bool in
            ExpoIapLog.payload("canPresentExternalPurchaseNoticeIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let canPresent = try await OpenIapModule.shared.canPresentExternalPurchaseNoticeIOS()
            ExpoIapLog.result("canPresentExternalPurchaseNoticeIOS", value: canPresent)
            return canPresent
        }

        AsyncFunction("presentExternalPurchaseNoticeSheetIOS") { () async throws -> [String: Any] in
            ExpoIapLog.payload("presentExternalPurchaseNoticeSheetIOS", payload: nil)
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let result = try await OpenIapModule.shared.presentExternalPurchaseNoticeSheetIOS()
            let sanitized = ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(result))
            ExpoIapLog.result("presentExternalPurchaseNoticeSheetIOS", value: sanitized)
            return sanitized
        }

        AsyncFunction("presentExternalPurchaseLinkIOS") { (url: String) async throws -> [String: Any] in
            ExpoIapLog.payload("presentExternalPurchaseLinkIOS", payload: ["url": url])
            try await ExpoIapHelper.ensureConnection(isInitialized: self.isInitialized)
            let result = try await OpenIapModule.shared.presentExternalPurchaseLinkIOS(url)
            let sanitized = ExpoIapHelper.sanitizeDictionary(OpenIapSerialization.encode(result))
            ExpoIapLog.result("presentExternalPurchaseLinkIOS", value: sanitized)
            return sanitized
        }
    }
}
