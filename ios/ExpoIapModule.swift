import ExpoModulesCore
import StoreKit
import OpenIAP

// Helper function for logging
private func logDebug(_ message: String) {
    print("🔷 [ExpoIapModule] \(message)")
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
    // Use OpenIapStore instead of OpenIapModule directly
    private let store = OpenIapStore()
    
    nonisolated public func definition() -> ModuleDefinition {
        Name("ExpoIap")
        
        Constants {
            PurchaseError.toDictionary()
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
            
            // Check if store is already connected
            let isAlreadyConnected = await self.store.isConnected
            if isAlreadyConnected {
                logDebug("Already connected, returning true")
                return true
            }
            
            try await self.store.initConnection()
            
            let isConnected = await self.store.isConnected
            logDebug("Connection initialized: \(isConnected)")
            return isConnected
        }
        
        AsyncFunction("endConnection") { () async throws -> Bool in
            logDebug("endConnection called")
            
            try await self.store.endConnection()
            
            logDebug("Connection ended")
            return true
        }
        
        // MARK: - Product Management
        
        AsyncFunction("fetchProducts") { (params: [String: Any]) async throws -> [[String: Any?]] in
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
                throw OpenIapError.purchaseFailed(reason: "Empty SKU list provided")
            }
            
            // Convert string to RequestProductType enum
            let productType: RequestProductType = {
                switch typeString {
                case "inapp":
                    return .inapp
                case "subs":
                    return .subs
                default:
                    return .all
                }
            }()
            
            logDebug("Converted type to RequestProductType: \(productType)")
            
            // Check connection before fetching
            let isConnected = await self.store.isConnected
            logDebug("Store connection status before fetchProducts: \(isConnected)")
            
            guard isConnected else {
                logDebug("ERROR: Store not connected!")
                throw OpenIapError.purchaseFailed(reason: "Connection not initialized")
            }
            
            do {
                logDebug("Calling store.fetchProducts with skus: \(skus), type: \(productType)")
                try await self.store.fetchProducts(skus: skus, type: productType)
                logDebug("store.fetchProducts completed successfully")
            } catch {
                logDebug("fetchProducts error: \(error)")
                throw error
            }
            
            let products = await self.store.products
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
            return await MainActor.run {
                products.map { self.serializeProduct($0) }
            }
        }
        
        AsyncFunction("getProducts") { () async throws -> [[String: Any?]] in
            logDebug("getProducts called")
            
            let products = await self.store.products
            return await MainActor.run {
                products.map { self.serializeProduct($0) }
            }
        }
        
        // MARK: - Purchase Operations
        
        AsyncFunction("requestPurchase") { (params: [String: Any]) async throws in
            // Extract and validate required fields
            guard let sku = params["sku"] as? String, !sku.isEmpty else {
                throw OpenIapError.purchaseFailed(reason: "Missing required 'sku'")
            }

            // Optional fields
            let andFinish = (params["andDangerouslyFinishTransactionAutomatically"] as? Bool) ?? false
            let appAccountToken = params["appAccountToken"] as? String
            let quantity: Int? = {
                if let q = params["quantity"] as? Int { return q }
                if let qd = params["quantity"] as? Double { return Int(qd) }
                return nil
            }()

            // Discount offer mapping (strings expected from JS)
            var discountOffer: DiscountOffer? = nil
            if let offer = params["withOffer"] as? [String: Any] {
                let identifier = (offer["identifier"] as? String) ?? (offer["id"] as? String) ?? ""
                let keyIdentifier = (offer["keyIdentifier"] as? String) ?? ""
                let nonce = (offer["nonce"] as? String) ?? ""
                let signature = (offer["signature"] as? String) ?? ""
                let timestamp = (offer["timestamp"] as? String) ?? ""
                if !identifier.isEmpty && !keyIdentifier.isEmpty && !nonce.isEmpty && !signature.isEmpty && !timestamp.isEmpty {
                    discountOffer = DiscountOffer(
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
            
            
            // Check connection status before purchase
            let isConnected = await self.store.isConnected
            logDebug("Store connection status before purchase: \(isConnected)")
            
            let requestProps = RequestPurchaseProps(
                sku: sku,
                andDangerouslyFinishTransactionAutomatically: andFinish,
                appAccountToken: appAccountToken,
                quantity: quantity,
                withOffer: discountOffer
            )
            
            do {
                _ = try await self.store.requestPurchase(requestProps)
                logDebug("Purchase request completed successfully")
            } catch {
                logDebug("Purchase request failed with error: \(error)")
                throw error
            }
        }
        
        AsyncFunction("finishTransaction") { (transactionId: String) async throws -> Bool in
            logDebug("finishTransaction called with id: \(transactionId)")
            let result = try await OpenIapModule.shared.finishTransaction(transactionIdentifier: transactionId)
            return result
        }
        
        // MARK: - Purchase History
        
        AsyncFunction("getAvailablePurchases") { (options: [String: Any?]?) async throws -> [[String: Any?]] in
            logDebug("getAvailablePurchases called")
            
            if let options = options {
                let purchaseOptions = PurchaseOptions(
                    alsoPublishToEventListenerIOS: options["alsoPublishToEventListenerIOS"] as? Bool,
                    onlyIncludeActiveItemsIOS: options["onlyIncludeActiveItemsIOS"] as? Bool
                )
                try await self.store.getAvailablePurchases(purchaseOptions)
            } else {
                try await self.store.getAvailablePurchases()
            }
            
            return await MainActor.run {
                let purchases = self.store.availablePurchases
                return purchases.map { self.serializePurchase($0) }
            }
        }
        
        // Legacy function for backward compatibility
        AsyncFunction("getAvailableItems") { (alsoPublishToEventListener: Bool, onlyIncludeActiveItems: Bool) async throws -> [[String: Any?]] in
            logDebug("getAvailableItems called (legacy)")
            
            let purchaseOptions = PurchaseOptions(
                alsoPublishToEventListenerIOS: alsoPublishToEventListener,
                onlyIncludeActiveItemsIOS: onlyIncludeActiveItems
            )
            try await self.store.getAvailablePurchases(purchaseOptions)
            
            return await MainActor.run {
                let purchases = self.store.availablePurchases
                return purchases.map { self.serializePurchase($0) }
            }
        }
        
        AsyncFunction("restorePurchases") { () async throws -> [[String: Any?]] in
            logDebug("restorePurchases called")
            
            try await self.store.restorePurchases()
            
            return await MainActor.run {
                let purchases = self.store.availablePurchases
                return purchases.map { self.serializePurchase($0) }
            }
        }
        
        AsyncFunction("getPendingTransactionsIOS") { () async throws -> [[String: Any?]] in
            logDebug("getPendingTransactionsIOS called")
            
            let pendingTransactions = try await self.store.getPendingTransactionsIOS()
            return await MainActor.run {
                pendingTransactions.map { self.serializePurchase($0) }
            }
        }
        
        AsyncFunction("clearTransactionIOS") { () async throws -> Bool in
            logDebug("clearTransactionIOS called")
            try await self.store.clearTransactionIOS()
            return true
        }
        
        // MARK: - Receipt & Validation
        
        AsyncFunction("getReceiptIOS") { () async throws -> String in
            logDebug("getReceiptIOS called")
            return try await self.store.getReceiptDataIOS() ?? ""
        }
        
        AsyncFunction("requestReceiptRefreshIOS") { () async throws -> String in
            logDebug("requestReceiptRefreshIOS called")
            // Receipt refresh is handled automatically by StoreKit 2
            return try await self.store.getReceiptDataIOS() ?? ""
        }
        
        AsyncFunction("validateReceiptIOS") { (sku: String) async throws -> [String: Any?] in
            logDebug("validateReceiptIOS called for sku: \(sku)")
            
            let props = ReceiptValidationProps(sku: sku)
            let result = try await self.store.validateReceiptIOS(props)
            
            return await MainActor.run {
                return [
                    "isValid": result.isValid,
                    "receiptData": result.receiptData,
                    "jwsRepresentation": result.jwsRepresentation,
                    "latestTransaction": result.latestTransaction != nil ? self.serializePurchase(result.latestTransaction!) : nil
                ]
            }
        }
        
        // MARK: - iOS Specific Features
        
        AsyncFunction("presentCodeRedemptionSheetIOS") { () async throws -> Bool in
            logDebug("presentCodeRedemptionSheetIOS called")
            try await self.store.presentCodeRedemptionSheetIOS()
            return true
        }
        
        AsyncFunction("showManageSubscriptionsIOS") { () async throws -> Bool in
            logDebug("showManageSubscriptionsIOS called")
            try await self.store.showManageSubscriptionsIOS()
            return true
        }
        
        AsyncFunction("deepLinkToSubscriptionsIOS") { () async throws in
            logDebug("deepLinkToSubscriptionsIOS called")
            try await self.store.deepLinkToSubscriptionsIOS()
        }
        
        AsyncFunction("beginRefundRequestIOS") { (sku: String) async throws -> String? in
            logDebug("beginRefundRequestIOS called for sku: \(sku)")
            return try await self.store.beginRefundRequestIOS(sku: sku)
        }
        
        AsyncFunction("getPromotedProductIOS") { () async throws -> [String: Any?]? in
            logDebug("getPromotedProductIOS called")
            
            if let promotedProduct = try await self.store.getPromotedProductIOS() {
                return [
                    "productIdentifier": promotedProduct.productIdentifier,
                    "localizedTitle": promotedProduct.localizedTitle,
                    "localizedDescription": promotedProduct.localizedDescription,
                    "price": promotedProduct.price,
                    "priceLocale": [
                        "currencyCode": promotedProduct.priceLocale.currencyCode,
                        "currencySymbol": promotedProduct.priceLocale.currencySymbol
                    ]
                ]
            }
            return nil
        }
        
        AsyncFunction("buyPromotedProductIOS") { () async throws in
            logDebug("buyPromotedProductIOS called")
            try await self.store.requestPurchaseOnPromotedProductIOS()
        }
        
        AsyncFunction("getStorefrontIOS") { () async throws -> String in
            logDebug("getStorefrontIOS called")
            return try await self.store.getStorefrontIOS()
        }
        
        AsyncFunction("syncIOS") { () async throws -> Bool in
            logDebug("syncIOS called")
            return try await self.store.syncIOS()
        }
        
        // MARK: - Additional iOS Methods
        
        AsyncFunction("isTransactionVerifiedIOS") { (sku: String) async throws -> Bool in
            logDebug("isTransactionVerifiedIOS called for sku: \(sku)")
            return await self.store.isTransactionVerifiedIOS(sku: sku)
        }
        
        AsyncFunction("getTransactionJwsIOS") { (sku: String) async throws -> String? in
            logDebug("getTransactionJwsIOS called for sku: \(sku)")
            return try await self.store.getTransactionJwsIOS(sku: sku)
        }
        
        AsyncFunction("isEligibleForIntroOfferIOS") { (groupID: String) async throws -> Bool in
            logDebug("isEligibleForIntroOfferIOS called for groupID: \(groupID)")
            return await self.store.isEligibleForIntroOfferIOS(groupID: groupID)
        }
        
        AsyncFunction("subscriptionStatusIOS") { (sku: String) async throws -> [[String: Any?]]? in
            logDebug("subscriptionStatusIOS called for sku: \(sku)")
            
            if let statuses = try await self.store.subscriptionStatusIOS(sku: sku) {
                return statuses.map { status in
                    return [
                        "state": status.state,
                        "autoRenewStatus": status.renewalInfo?.autoRenewStatus,
                        "autoRenewPreference": status.renewalInfo?.autoRenewPreference,
                        "expirationReason": status.renewalInfo?.expirationReason,
                        "currentProductID": status.renewalInfo?.currentProductID,
                        "gracePeriodExpirationDate": status.renewalInfo?.gracePeriodExpirationDate
                    ]
                }
            }
            return nil
        }
        
        AsyncFunction("currentEntitlementIOS") { (sku: String) async throws -> [String: Any?]? in
            logDebug("currentEntitlementIOS called for sku: \(sku)")
            
            if let entitlement = try await self.store.currentEntitlementIOS(sku: sku) {
                return await MainActor.run {
                    self.serializePurchase(entitlement)
                }
            }
            return nil
        }
        
        AsyncFunction("latestTransactionIOS") { (sku: String) async throws -> [String: Any?]? in
            logDebug("latestTransactionIOS called for sku: \(sku)")
            
            if let transaction = try await self.store.latestTransactionIOS(sku: sku) {
                return await MainActor.run {
                    self.serializePurchase(transaction)
                }
            }
            return nil
        }
    }
    
    // MARK: - Store Setup
    
    @MainActor
    private func setupStore() {
        logDebug("Setting up store callbacks")
        
        store.onPurchaseSuccess = { [weak self] purchase in
            guard let self = self else {
                logDebug("⚠️ Purchase success callback - self is nil, cannot send event")
                return
            }
            logDebug("✅ Purchase success callback - sending event")
            let purchaseData = self.serializePurchase(purchase)
            self.sendEvent(OpenIapEvent.PurchaseUpdated, purchaseData)
        }
        
        store.onPurchaseError = { [weak self] error in
            guard let self = self else {
                logDebug("⚠️ Purchase error callback - self is nil, cannot send event")
                return
            }
            logDebug("❌ Purchase error callback - sending error event")
            let errorData: [String: Any?] = [
                "code": error.code,
                "message": error.message,
                "productId": error.productId
            ]
            self.sendEvent(OpenIapEvent.PurchaseError, errorData)
        }
        
        store.onPromotedProduct = { [weak self] productId in
            guard let self = self else {
                logDebug("⚠️ Promoted product callback - self is nil, cannot send event")
                return
            }
            logDebug("📱 Promoted product callback - sending event for: \(productId)")
            self.sendEvent(OpenIapEvent.PromotedProductIOS, ["productId": productId])
        }
    }
    
    @MainActor
    private func cleanupStore() async {
        logDebug("Cleaning up store")
        let isConnected = store.isConnected
        if isConnected {
            try? await store.endConnection()
        }
    }
    
    // MARK: - Serialization Helpers
    
    @MainActor
    private func serializeProduct(_ product: OpenIapProduct) -> [String: Any?] {
        return [
            "platform": "ios", // Required for isProductIOS check
            "id": product.id,
            "title": product.title,
            "description": product.description,
            "price": product.price ?? 0,
            "localizedPrice": product.displayPrice,
            "currency": product.currency,
            "type": product.type,
            "displayPrice": product.displayPrice,
            "displayName": product.displayName,
            "jsonRepresentationIOS": product.jsonRepresentationIOS,
            "isFamilyShareable": product.isFamilyShareableIOS,
            "subscriptionPeriodNumberIOS": product.subscriptionInfoIOS?.subscriptionPeriod.value ?? 0,
            "subscriptionPeriodUnitIOS": product.subscriptionInfoIOS?.subscriptionPeriod.unit.rawValue,
            "introductoryPricePaymentModeIOS": product.subscriptionInfoIOS?.introductoryOffer?.paymentMode.rawValue,
            "introductoryPriceNumberOfPeriodsIOS": product.subscriptionInfoIOS?.introductoryOffer?.periodCount ?? 0,
            "introductoryPriceSubscriptionPeriodIOS": product.subscriptionInfoIOS?.introductoryOffer?.period.unit.rawValue,
            "subscriptionPeriodAndroid": nil,
            "subscriptionPeriodUnitAndroid": nil,
            "introductoryPriceCyclesAndroid": nil,
            "introductoryPricePeriodAndroid": nil,
            "freeTrialPeriodAndroid": nil,
            "discounts": product.discountsIOS?.map { discount in
                [
                    "identifier": discount.identifier,
                    "type": discount.type,
                    "numberOfPeriods": discount.numberOfPeriods,
                    "price": discount.priceAmount,
                    "localizedPrice": discount.price,
                    "paymentMode": discount.paymentMode,
                    "subscriptionPeriod": discount.subscriptionPeriod
                ]
            }
        ]
    }
    
    @MainActor
    private func serializePurchase(_ purchase: OpenIapPurchase) -> [String: Any?] {
        return [
            "platform": "ios", // Required for platform-specific checks
            "id": purchase.id,
            "productId": purchase.productId,
            "transactionDate": purchase.transactionDate,
            "transactionReceipt": purchase.transactionReceipt,
            "purchaseToken": purchase.purchaseToken,
            "quantity": purchase.quantity,
            "purchaseState": purchase.purchaseState.rawValue,
            "isAutoRenewing": purchase.isAutoRenewing,
            
            // iOS specific fields
            "quantityIOS": purchase.quantityIOS,
            "originalTransactionDateIOS": purchase.originalTransactionDateIOS,
            "originalTransactionIdentifierIOS": purchase.originalTransactionIdentifierIOS,
            "appAccountToken": purchase.appAccountToken,
            "expirationDateIOS": purchase.expirationDateIOS,
            "webOrderLineItemIdIOS": purchase.webOrderLineItemIdIOS,
            "environmentIOS": purchase.environmentIOS,
            "storefrontCountryCodeIOS": purchase.storefrontCountryCodeIOS,
            "appBundleIdIOS": purchase.appBundleIdIOS,
            "productTypeIOS": purchase.productTypeIOS,
            "subscriptionGroupIdIOS": purchase.subscriptionGroupIdIOS,
            "isUpgradedIOS": purchase.isUpgradedIOS,
            "ownershipTypeIOS": purchase.ownershipTypeIOS,
            "reasonIOS": purchase.reasonIOS,
            "reasonStringRepresentationIOS": purchase.reasonStringRepresentationIOS,
            "transactionReasonIOS": purchase.transactionReasonIOS,
            "revocationDateIOS": purchase.revocationDateIOS,
            "revocationReasonIOS": purchase.revocationReasonIOS,
            "offerIOS": purchase.offerIOS != nil ? [
                "id": purchase.offerIOS!.id,
                "type": purchase.offerIOS!.type,
                "paymentMode": purchase.offerIOS!.paymentMode
            ] : nil,
            "currencyCodeIOS": purchase.currencyCodeIOS,
            "currencySymbolIOS": purchase.currencySymbolIOS,
            "countryCodeIOS": purchase.countryCodeIOS
        ]
    }
}

// MARK: - Error Mapping

extension PurchaseError {
    static func toDictionary() -> [String: String] {
        return [
            // User Action Errors
            "userCancelled": PurchaseError.E_USER_CANCELLED,
            "userError": PurchaseError.E_USER_ERROR,
            "deferredPayment": PurchaseError.E_DEFERRED_PAYMENT,
            "interrupted": PurchaseError.E_INTERRUPTED,
            
            // Product Errors  
            "itemUnavailable": PurchaseError.E_ITEM_UNAVAILABLE,
            "skuNotFound": PurchaseError.E_SKU_NOT_FOUND,
            "skuOfferMismatch": PurchaseError.E_SKU_OFFER_MISMATCH,
            "queryProduct": PurchaseError.E_QUERY_PRODUCT,
            "alreadyOwned": PurchaseError.E_ALREADY_OWNED,
            "itemNotOwned": PurchaseError.E_ITEM_NOT_OWNED,
            
            // Network & Service Errors
            "networkError": PurchaseError.E_NETWORK_ERROR,
            "serviceError": PurchaseError.E_SERVICE_ERROR,
            "remoteError": PurchaseError.E_REMOTE_ERROR,
            "initConnection": PurchaseError.E_INIT_CONNECTION,
            "serviceDisconnected": PurchaseError.E_SERVICE_DISCONNECTED,
            "connectionClosed": PurchaseError.E_CONNECTION_CLOSED,
            "iapNotAvailable": PurchaseError.E_IAP_NOT_AVAILABLE,
            "billingUnavailable": PurchaseError.E_BILLING_UNAVAILABLE,
            "featureNotSupported": PurchaseError.E_FEATURE_NOT_SUPPORTED,
            "syncError": PurchaseError.E_SYNC_ERROR,
            
            // Validation Errors
            "receiptFailed": PurchaseError.E_RECEIPT_FAILED,
            "receiptFinished": PurchaseError.E_RECEIPT_FINISHED,
            "receiptFinishedFailed": PurchaseError.E_RECEIPT_FINISHED_FAILED,
            "transactionValidationFailed": PurchaseError.E_TRANSACTION_VALIDATION_FAILED,
            "emptySkuList": PurchaseError.E_EMPTY_SKU_LIST,
            
            // Generic Error
            "unknown": PurchaseError.E_UNKNOWN
        ]
    }
}
