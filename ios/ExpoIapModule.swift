import ExpoModulesCore
import StoreKit
import OpenIAP
import OSLog

private let iapLogger = Logger(subsystem: "dev.hyo.expo-iap", category: "ExpoIapModule")
private func logDebug(_ message: String) {
    // Use OSLog/Logger so logs are structured and filterable
    // Suppress debug logs in Release builds
    #if DEBUG
    iapLogger.debug("\(message, privacy: .public)")
    #endif
}

// MARK: - Swift helpers for optional dictionary compaction
private extension Sequence where Element == [String: Any?] {
    func compactingValues() -> [[String: Any]] {
        return self.map { $0.compactMapValues { $0 } }
    }
}

private extension Dictionary where Key == String, Value == Any? {
    func compactingValues() -> [String: Any] {
        return self.compactMapValues { $0 }
    }
}

// Event names
struct OpenIapEvent {
    static let PurchaseUpdated = "purchase-updated"
    static let PurchaseError = "purchase-error"
    static let PromotedProductIOS = "promoted-product-ios"
}

@available(iOS 15.0, tvOS 15.0, *)
@MainActor
public class ExpoIapModule: Module {
    // Connection state for local validation parity with RN module
    private var isInitialized: Bool = false
    // Subscriptions for OpenIapModule event listeners
    private var purchaseUpdatedSub: Subscription?
    private var purchaseErrorSub: Subscription?
    private var promotedProductSub: Subscription?

    // Helper to safely remove a listener and nil out the reference
    private func removeListener(_ sub: inout Subscription?) {
        if let s = sub { OpenIapModule.shared.removeListener(s) }
        sub = nil
    }
    
    nonisolated public func definition() -> ModuleDefinition {
        Name("ExpoIap")
        
        Constants {
            OpenIapSerialization.errorCodes()
        }
        
        Events(
            OpenIapEvent.PurchaseUpdated,
            OpenIapEvent.PurchaseError,
            OpenIapEvent.PromotedProductIOS
        )
        
        OnCreate {
            logDebug("Module created")
            Task { @MainActor in
                self.setupStore()
            }
        }
        
        OnDestroy {
            logDebug("Module destroyed")
            Task { @MainActor in
                await self.cleanupStore()
            }
        }
        
        // MARK: - Connection Management
        
        AsyncFunction("initConnection") { () async throws -> Bool in
            logDebug("initConnection called")
            let isConnected = try await OpenIapModule.shared.initConnection()
            // Track initialization locally for ensureConnection()
            await MainActor.run { self.isInitialized = isConnected }
            logDebug("Connection initialized: \(isConnected)")
            return isConnected
        }
        
        AsyncFunction("endConnection") { () async throws -> Bool in
            logDebug("endConnection called")
            let _ = try await OpenIapModule.shared.endConnection()
            
            logDebug("Connection ended")
            await MainActor.run { self.isInitialized = false }
            return true
        }
        
        // MARK: - Product Management
        
        AsyncFunction("fetchProducts") { (params: [String: Any]) async throws -> [[String: Any]] in
            try await ensureConnection()
            logDebug("fetchProducts raw params: \(params)")
            
            // Handle both object format {skus: [...], type: "..."} and array format
            var skus: [String] = []
            var typeString = "all"
            
            if let skusArray = params["skus"] as? [String] {
                // Object format: {skus: [...], type: "..."}
                skus = skusArray
                typeString = params["type"] as? String ?? "all"
            } else {
                // Array format passed directly - reconstruct from indexed keys
                var tempSkus: [String] = []
                var index = 0
                while let sku = params["\(index)"] as? String {
                    tempSkus.append(sku)
                    index += 1
                }
                skus = tempSkus
            }
            
            logDebug("fetchProducts parsed - skus: \(skus), type: \(typeString)")
            logDebug("SKUs count: \(skus.count)")
            
            // Validate SKUs
            guard !skus.isEmpty else {
                logDebug("ERROR: Empty SKUs array!")
                throw OpenIapError.emptySkuList()
            }
            
            // Convert string to OpenIapRequestProductType enum
            let productType: OpenIapRequestProductType = {
                switch typeString {
                case "inapp":
                    return .inapp
                case "subs":
                    return .subs
                default:
                    return .all
                }
            }()
            
            logDebug("Converted type to OpenIapRequestProductType: \(productType)")
            
            // Build OpenIapProductRequest and fetch via OpenIapModule
            let request = OpenIapProductRequest(skus: skus, type: productType)
            let products = try await OpenIapModule.shared.fetchProducts(request)
            logDebug("Fetched \(products.count) products from store")
            if products.isEmpty {
                logDebug("No products found. Possible reasons:")
                logDebug("1. Products not configured in App Store Connect")
                logDebug("2. Bundle ID mismatch")
                logDebug("3. Not signed in to sandbox account")
                logDebug("4. Products pending review")
            }
            for product in products {
                logDebug("Product: \(product.id) - \(product.title) - \(product.displayPrice)")
            }
            // Ensure non-optional values for Expo bridge
            return OpenIapSerialization.products(products).compactingValues()
        }
        
        // MARK: - Purchase Operations
        
        AsyncFunction("requestPurchase") { (params: [String: Any]) async throws in
            // Extract and validate required fields
            guard let sku = params["sku"] as? String, !sku.isEmpty else {
                throw OpenIapError.make(code: OpenIapError.E_PURCHASE_ERROR, message: "Missing required 'sku'")
            }
            try await ensureConnection()

            // Optional fields
            let andFinish = (params["andDangerouslyFinishTransactionAutomatically"] as? Bool) ?? false
            let appAccountToken = params["appAccountToken"] as? String
            let quantity: Int? = {
                if let q = params["quantity"] as? Int { return q }
                if let qd = params["quantity"] as? Double { return Int(qd) }
                return nil
            }()

            // Discount offer mapping (strings expected from JS)
            // Use OpenIapDiscountOffer from OpenIAP package (avoid relying on legacy typealiases)
            var discountOffer: OpenIapDiscountOffer? = nil
            if let offer = params["withOffer"] as? [String: Any] {
                let identifier = (offer["identifier"] as? String) ?? (offer["id"] as? String) ?? ""
                let keyIdentifier = (offer["keyIdentifier"] as? String) ?? ""
                let nonce = (offer["nonce"] as? String) ?? ""
                let signature = (offer["signature"] as? String) ?? ""
                let timestamp = (offer["timestamp"] as? String) ?? ""
                if !identifier.isEmpty && !keyIdentifier.isEmpty && !nonce.isEmpty && !signature.isEmpty && !timestamp.isEmpty {
                    discountOffer = OpenIapDiscountOffer(
                        identifier: identifier,
                        keyIdentifier: keyIdentifier,
                        nonce: nonce,
                        signature: signature,
                        timestamp: timestamp
                    )
                }
            }

            let tokenForLog = appAccountToken ?? "nil"
            let qtyForLog = quantity ?? -1
            logDebug("requestPurchase parsed - sku: \(sku), andFinish: \(andFinish), appAccountToken: \(tokenForLog), quantity: \(qtyForLog), hasOffer: \(discountOffer != nil)")
            
            
            // Build purchase request props using OpenIapRequestPurchaseProps
            let requestProps = OpenIapRequestPurchaseProps(
                sku: sku,
                andDangerouslyFinishTransactionAutomatically: andFinish,
                appAccountToken: appAccountToken,
                quantity: quantity,
                withOffer: discountOffer
            )
            
            do {
                _ = try await OpenIapModule.shared.requestPurchase(requestProps)
                logDebug("Purchase request completed successfully")
            } catch {
                logDebug("Purchase request failed with error: \(error)")
                if let openIapError = error as? OpenIapError {
                    throw openIapError
                }
                throw OpenIapError.make(code: OpenIapError.E_PURCHASE_ERROR, message: error.localizedDescription)
            }
        }
        
        AsyncFunction("finishTransaction") { (transactionId: String) async throws -> Bool in
            try await ensureConnection()
            logDebug("finishTransaction called with id: \(transactionId)")
            let result = try await OpenIapModule.shared.finishTransaction(transactionIdentifier: transactionId)
            return result
        }
        
        // MARK: - Purchase History
        
        AsyncFunction("getAvailablePurchases") { (options: [String: Any?]?) async throws -> [[String: Any]] in
            try await ensureConnection()
            logDebug("getAvailablePurchases called")
            
            // Build options and get purchases directly from OpenIapModule
            let purchaseOptions: OpenIapGetAvailablePurchasesProps? = options.map {
                OpenIapGetAvailablePurchasesProps(
                    alsoPublishToEventListenerIOS: $0["alsoPublishToEventListenerIOS"] as? Bool,
                    onlyIncludeActiveItemsIOS: $0["onlyIncludeActiveItemsIOS"] as? Bool
                )
            }
            let purchases = try await OpenIapModule.shared.getAvailablePurchases(purchaseOptions)
            return OpenIapSerialization.purchases(purchases).compactingValues()
        }
        
        // Legacy function for backward compatibility
        AsyncFunction("getAvailableItems") { (alsoPublishToEventListener: Bool, onlyIncludeActiveItems: Bool) async throws -> [[String: Any]] in
            try await ensureConnection()
            logDebug("getAvailableItems called (legacy)")
            
            let purchaseOptions = OpenIapGetAvailablePurchasesProps(
                alsoPublishToEventListenerIOS: alsoPublishToEventListener,
                onlyIncludeActiveItemsIOS: onlyIncludeActiveItems
            )
            let purchases = try await OpenIapModule.shared.getAvailablePurchases(purchaseOptions)
            return OpenIapSerialization.purchases(purchases).compactingValues()
        }
        
        AsyncFunction("getPendingTransactionsIOS") { () async throws -> [[String: Any]] in
            try await ensureConnection()
            logDebug("getPendingTransactionsIOS called")
            
            let pendingTransactions = try await OpenIapModule.shared.getPendingTransactionsIOS()
            return OpenIapSerialization.purchases(pendingTransactions).compactingValues()
        }
        
        AsyncFunction("clearTransactionIOS") { () async throws -> Bool in
            try await ensureConnection()
            logDebug("clearTransactionIOS called")
            try await OpenIapModule.shared.clearTransactionIOS()
            return true
        }
        
        // MARK: - Receipt & Validation
        
        AsyncFunction("getReceiptIOS") { () async throws -> String in
            try await ensureConnection()
            logDebug("getReceiptIOS called")
            return try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
        }
        
        // Backward-compatible alias expected by JS layer/tests
        AsyncFunction("getReceiptDataIOS") { () async throws -> String in
            try await ensureConnection()
            logDebug("getReceiptDataIOS called (alias of getReceiptIOS)")
            return try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
        }
        
        AsyncFunction("requestReceiptRefreshIOS") { () async throws -> String in
            try await ensureConnection()
            logDebug("requestReceiptRefreshIOS called")
            // Receipt refresh is handled automatically by StoreKit 2
            return try await OpenIapModule.shared.getReceiptDataIOS() ?? ""
        }
        
        AsyncFunction("validateReceiptIOS") { (sku: String) async throws -> [String: Any] in
            try await ensureConnection()
            logDebug("validateReceiptIOS called for sku: \(sku)")
            do {
                // Use OpenIapReceiptValidationProps to keep naming parity with OpenIAP
                let props = OpenIapReceiptValidationProps(sku: sku)
                let result = try await OpenIapModule.shared.validateReceiptIOS(props)
                let dict: [String: Any?] = [
                    "isValid": result.isValid,
                    "receiptData": result.receiptData,
                    "jwsRepresentation": result.jwsRepresentation,
                    // Populate unified purchaseToken for iOS as alias of JWS
                    "purchaseToken": result.jwsRepresentation,
                    "latestTransaction": result.latestTransaction.map { OpenIapSerialization.purchase($0).compactingValues() },
                ]
                return dict.compactingValues()
            } catch {
                throw OpenIapError.make(code: OpenIapError.E_RECEIPT_FAILED)
            }
        }
        
        // MARK: - iOS Specific Features
        
        AsyncFunction("presentCodeRedemptionSheetIOS") { () async throws -> Bool in
            try await ensureConnection()
            logDebug("presentCodeRedemptionSheetIOS called")
            let _ = try await OpenIapModule.shared.presentCodeRedemptionSheetIOS()
            return true
        }
        
        AsyncFunction("showManageSubscriptionsIOS") { () async throws -> [[String: Any]] in
            try await ensureConnection()
            logDebug("showManageSubscriptionsIOS called")
            // OpenIAP 1.1.9 returns already-serialized dictionaries here.
            let purchases = try await OpenIapModule.shared.showManageSubscriptionsIOS()
            return purchases.compactingValues()
        }
        
        AsyncFunction("deepLinkToSubscriptionsIOS") { () async throws in
            logDebug("deepLinkToSubscriptionsIOS called")
            // Open App Store subscriptions page directly
            if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                #if canImport(UIKit)
                await MainActor.run {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
                #endif
            }
        }
        
        AsyncFunction("beginRefundRequestIOS") { (sku: String) async throws -> String? in
            try await ensureConnection()
            logDebug("beginRefundRequestIOS called for sku: \(sku)")
            return try await OpenIapModule.shared.beginRefundRequestIOS(sku: sku)
        }
        
        AsyncFunction("getPromotedProductIOS") { () async throws -> [String: Any]? in
            try await ensureConnection()
            logDebug("getPromotedProductIOS called")
            
            if let promoted = try await OpenIapModule.shared.getPromotedProductIOS() {
                // Fetch full product info by SKU to conform to OpenIapProduct
                let request = OpenIapProductRequest(skus: [promoted.productIdentifier], type: .all)
                let products = try await OpenIapModule.shared.fetchProducts(request)
                let serialized = OpenIapSerialization.products(products).compactingValues()
                return serialized.first
            }
            return nil
        }
        AsyncFunction("getStorefrontIOS") { () async throws -> String in
            try await ensureConnection()
            logDebug("getStorefrontIOS called")
            return try await OpenIapModule.shared.getStorefrontIOS()
        }
        
        AsyncFunction("syncIOS") { () async throws -> Bool in
            try await ensureConnection()
            logDebug("syncIOS called")
            return try await OpenIapModule.shared.syncIOS()
        }
        
        // MARK: - Additional iOS Methods
        
        AsyncFunction("isTransactionVerifiedIOS") { (sku: String) async throws -> Bool in
            try await ensureConnection()
            logDebug("isTransactionVerifiedIOS called for sku: \(sku)")
            return await OpenIapModule.shared.isTransactionVerifiedIOS(sku: sku)
        }
        
        AsyncFunction("getTransactionJwsIOS") { (sku: String) async throws -> String? in
            try await ensureConnection()
            logDebug("getTransactionJwsIOS called for sku: \(sku)")
            return try await OpenIapModule.shared.getTransactionJwsIOS(sku: sku)
        }
        
        AsyncFunction("isEligibleForIntroOfferIOS") { (groupID: String) async throws -> Bool in
            try await ensureConnection()
            logDebug("isEligibleForIntroOfferIOS called for groupID: \(groupID)")
            return await OpenIapModule.shared.isEligibleForIntroOfferIOS(groupID: groupID)
        }
        
        AsyncFunction("subscriptionStatusIOS") { (sku: String) async throws -> [[String: Any]]? in
            try await ensureConnection()
            logDebug("subscriptionStatusIOS called for sku: \(sku)")
            
            if let statuses = try await OpenIapModule.shared.subscriptionStatusIOS(sku: sku) {
                // Align output with SubscriptionStatusIOS in TS:
                // { state: SubscriptionState; renewalInfo?: { jsonRepresentation?: string; willAutoRenew: boolean; autoRenewPreference?: string } }
                return statuses.map { status in
                    var dict: [String: Any?] = [
                        "state": status.state
                    ]

                    if let info = status.renewalInfo {
                        // autoRenewStatus is a Bool from OpenIAP types
                        let renewalInfo: [String: Any?] = [
                            "willAutoRenew": info.autoRenewStatus,
                            "autoRenewPreference": info.autoRenewPreference
                        ]
                        dict["renewalInfo"] = renewalInfo
                    }

                    return dict.compactingValues()
                }
            }
            return nil
        }
        
        AsyncFunction("currentEntitlementIOS") { (sku: String) async throws -> [String: Any]? in
            try await ensureConnection()
            logDebug("currentEntitlementIOS called for sku: \(sku)")
            do {
                if let entitlement = try await OpenIapModule.shared.currentEntitlementIOS(sku: sku) {
                    return OpenIapSerialization.purchase(entitlement).compactingValues()
                }
                return nil
            } catch {
                throw OpenIapError.make(code: OpenIapError.E_SKU_NOT_FOUND, productId: sku)
            }
        }
        
        AsyncFunction("latestTransactionIOS") { (sku: String) async throws -> [String: Any]? in
            try await ensureConnection()
            logDebug("latestTransactionIOS called for sku: \(sku)")
            do {
                if let transaction = try await OpenIapModule.shared.latestTransactionIOS(sku: sku) {
                    return OpenIapSerialization.purchase(transaction).compactingValues()
                }
                return nil
            } catch {
                throw OpenIapError.make(code: OpenIapError.E_SKU_NOT_FOUND, productId: sku)
            }
        }
    }
    
    // MARK: - Listeners Setup
    
    @MainActor
    private func setupStore() {
        logDebug("Setting up OpenIapModule event listeners")
        
        purchaseUpdatedSub = OpenIapModule.shared.purchaseUpdatedListener { [weak self] purchase in
            Task { @MainActor in
                guard let self else { return }
                logDebug("✅ Purchase success callback - sending event")
                let purchaseData = OpenIapSerialization.purchase(purchase)
                self.sendEvent(OpenIapEvent.PurchaseUpdated, purchaseData)
            }
        }
        
        purchaseErrorSub = OpenIapModule.shared.purchaseErrorListener { [weak self] event in
            Task { @MainActor in
                guard let self else { return }
                logDebug("❌ Purchase error callback - sending error event")
                let errorData: [String: Any?] = [
                    "code": event.code,
                    "message": event.message,
                    "productId": event.productId
                ]
                self.sendEvent(OpenIapEvent.PurchaseError, errorData)
            }
        }
        
        promotedProductSub = OpenIapModule.shared.promotedProductListenerIOS { [weak self] productId in
            Task { @MainActor in
                guard let self else { return }
                logDebug("📱 Promoted product callback - sending event for: \(productId)")
                self.sendEvent(OpenIapEvent.PromotedProductIOS, ["productId": productId])
            }
        }
    }
    
    @MainActor
    private func cleanupStore() async {
        logDebug("Cleaning up listeners and ending connection")
        removeListener(&purchaseUpdatedSub)
        removeListener(&purchaseErrorSub)
        removeListener(&promotedProductSub)
        _ = try? await OpenIapModule.shared.endConnection()
    }
    
    // MARK: - Private Helper Methods
    
    private func ensureConnection() throws {
        guard isInitialized else {
            throw OpenIapError.make(
                code: OpenIapError.E_INIT_CONNECTION,
                message: "Connection not initialized. Call initConnection() first."
            )
        }
    }

}
