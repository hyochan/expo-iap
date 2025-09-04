import ExpoModulesCore
import OpenIAP

func logDebug(_ message: String) {
    #if DEBUG
        print("DEBUG - \(message)")
    #endif
}

struct IapEvent {
    static let PurchaseUpdated = "purchase-updated"
    static let PurchaseError = "purchase-error"
    static let PromotedProductIOS = "promoted-product-ios"
}

@available(iOS 15.0, tvOS 15.0, *)
public class ExpoIapModule: Module {
    private let iapModule = OpenIapModule.shared
    private var hasListeners = false
    
    public func definition() -> ModuleDefinition {
        Name("ExpoIap")
        
        Events(IapEvent.PurchaseUpdated, IapEvent.PurchaseError, IapEvent.PromotedProductIOS)
        
        AsyncFunction("initConnection") { () async throws -> Bool in
            logDebug("initConnection called")
            
            if !self.hasListeners {
                self.setupPurchaseListeners()
                self.hasListeners = true
            }
            
            return try await self.iapModule.initConnection()
        }
        
        AsyncFunction("endConnection") { () async throws -> Bool in
            logDebug("endConnection called")
            
            if self.hasListeners {
                self.iapModule.removeAllPurchaseUpdatedListeners()
                self.iapModule.removeAllPurchaseErrorListeners()
                self.hasListeners = false
            }
            
            return try await self.iapModule.endConnection()
        }
        
        AsyncFunction("fetchProducts") { (skus: [String]) async throws -> [[String: Any?]] in
            logDebug("fetchProducts called with skus: \(skus)")
            let products = try await self.iapModule.fetchProducts(skus: skus)
            
            // Debug logging
            for product in products {
                logDebug("Product: id=\(product.id), title=\(product.localizedTitle), description=\(product.localizedDescription)")
                logDebug("Product: price=\(product.price), displayPrice=\(product.localizedPrice), currency=\(product.currencyCode ?? "nil")")
                logDebug("Product: type=\(product.productType.rawValue), platform=\(product.platform)")
            }
            
            let serializedProducts = products.map { self.serializeProduct($0) }
            logDebug("Serialized products: \(serializedProducts)")
            return serializedProducts
        }
        
        AsyncFunction("getAvailableItems") { 
            (alsoPublishToEventListenerIOS: Bool?, onlyIncludeActiveItemsIOS: Bool?) async throws -> [[String: Any?]] in
            logDebug("getAvailableItems called")
            let transactions = try await self.iapModule.getAvailableItems(
                alsoPublishToEventListenerIOS: alsoPublishToEventListenerIOS,
                onlyIncludeActiveItemsIOS: onlyIncludeActiveItemsIOS
            )
            return transactions.map { self.serializePurchase($0) }
        }
        
        AsyncFunction("requestPurchase") { 
            (sku: String, 
             andDangerouslyFinishTransactionAutomaticallyIOS: Bool?,
             appAccountToken: String?,
             quantity: Int?,
             discountOffer: [String: String]?) async throws -> [String: Any?]? in
            
            logDebug("requestPurchase called for sku: \(sku)")
            
            let finishAutomatically = andDangerouslyFinishTransactionAutomaticallyIOS ?? false
            let qty = quantity ?? 1
            
            let transaction = try await self.iapModule.requestPurchase(
                sku: sku,
                andDangerouslyFinishTransactionAutomatically: finishAutomatically,
                appAccountToken: appAccountToken,
                quantity: qty,
                discountOffer: discountOffer
            )
            
            if let transaction = transaction {
                return self.serializePurchase(transaction)
            }
            return nil
        }
        
        AsyncFunction("finishTransaction") { (transactionIdentifier: String) async throws -> Bool in
            logDebug("finishTransaction called for id: \(transactionIdentifier)")
            return try await self.iapModule.finishTransaction(transactionIdentifier: transactionIdentifier)
        }
        
        AsyncFunction("getPendingTransactionsIOS") { () async throws -> [[String: Any?]] in
            logDebug("getPendingTransactionsIOS called")
            let transactions = try await self.iapModule.getPendingTransactionsIOS()
            return transactions.map { self.serializePurchase($0) }
        }
        
        AsyncFunction("clearTransactionIOS") { () async throws in
            logDebug("clearTransactionIOS called")
            try await self.iapModule.clearTransactionIOS()
        }
        
        AsyncFunction("getReceiptDataIOS") { () async throws -> String? in
            logDebug("getReceiptDataIOS called")
            return try await self.iapModule.getReceiptDataIOS()
        }
        
        AsyncFunction("getTransactionJwsIOS") { (sku: String) async throws -> String? in
            logDebug("getTransactionJwsIOS called for sku: \(sku)")
            return try await self.iapModule.getTransactionJwsIOS(sku: sku)
        }
        
        AsyncFunction("validateReceiptIOS") { (sku: String) async throws -> [String: Any?] in
            logDebug("validateReceiptIOS called for sku: \(sku)")
            let validation = try await self.iapModule.validateReceiptIOS(sku: sku)
            return [
                "isValid": validation.isValid,
                "errorMessage": nil
            ]
        }
        
        AsyncFunction("getStorefrontIOS") { () async throws -> String in
            logDebug("getStorefrontIOS called")
            return try await self.iapModule.getStorefrontIOS()
        }
        
        // Deprecated: Keep for backward compatibility
        AsyncFunction("getStorefront") { () async throws -> String in
            logDebug("getStorefront called (deprecated)")
            return try await self.iapModule.getStorefrontIOS()
        }
        
        AsyncFunction("getAppTransactionIOS") { () async throws -> [String: Any?]? in
            logDebug("getAppTransactionIOS called")
            if #available(iOS 16.0, tvOS 16.0, *) {
                if let appTransaction = try await self.iapModule.getAppTransactionIOS() {
                    return [
                        "appVersion": appTransaction.appVersion,
                        "originalAppVersion": appTransaction.originalAppVersion,
                        "originalPurchaseDate": appTransaction.originalPurchaseDate.timeIntervalSince1970 * 1000,
                        "deviceVerification": appTransaction.deviceVerification,
                        "deviceVerificationNonce": appTransaction.deviceVerificationNonce,
                        "preorderDate": appTransaction.preorderDate.map { $0.timeIntervalSince1970 * 1000 },
                        "jwsRepresentation": nil // Not available in IapAppTransaction
                    ]
                }
            }
            return nil
        }
        
        AsyncFunction("isEligibleForIntroOfferIOS") { (groupID: String) async -> Bool in
            logDebug("isEligibleForIntroOfferIOS called for groupID: \(groupID)")
            return await self.iapModule.isEligibleForIntroOfferIOS(groupID: groupID)
        }
        
        AsyncFunction("subscriptionStatusIOS") { (sku: String) async throws -> [[String: Any?]]? in
            logDebug("subscriptionStatusIOS called for sku: \(sku)")
            if let statuses = try await self.iapModule.subscriptionStatusIOS(sku: sku) {
                return statuses.map { status in
                    [
                        "state": status.state,
                        "renewalInfo": status.renewalInfo != nil ? [
                            "autoRenewPreference": status.renewalInfo!.autoRenewPreference,
                            "expirationReason": status.renewalInfo!.expirationReason,
                            "gracePeriodExpirationDate": status.renewalInfo!.gracePeriodExpirationDate.map { $0.timeIntervalSince1970 * 1000 }
                        ] : nil
                    ]
                }
            }
            return nil
        }
        
        AsyncFunction("currentEntitlementIOS") { (sku: String) async throws -> [String: Any?]? in
            logDebug("currentEntitlementIOS called for sku: \(sku)")
            if let transaction = try await self.iapModule.currentEntitlementIOS(sku: sku) {
                return self.serializePurchase(transaction)
            }
            return nil
        }
        
        AsyncFunction("latestTransactionIOS") { (sku: String) async throws -> [String: Any?]? in
            logDebug("latestTransactionIOS called for sku: \(sku)")
            if let transaction = try await self.iapModule.latestTransactionIOS(sku: sku) {
                return self.serializePurchase(transaction)
            }
            return nil
        }
        
        AsyncFunction("beginRefundRequestIOS") { (sku: String) async throws -> String? in
            logDebug("beginRefundRequestIOS called for sku: \(sku)")
            return try await self.iapModule.beginRefundRequestIOS(sku: sku)
        }
        
        AsyncFunction("getPromotedProductIOS") { () async throws -> [String: Any?]? in
            logDebug("getPromotedProductIOS called")
            if let promotedProduct = try await self.iapModule.getPromotedProductIOS() {
                return [
                    "productId": promotedProduct.productIdentifier,
                    "paymentDiscount": nil
                ]
            }
            return nil
        }
        
        AsyncFunction("requestPurchaseOnPromotedProductIOS") { () async throws in
            logDebug("requestPurchaseOnPromotedProductIOS called")
            try await self.iapModule.requestPurchaseOnPromotedProductIOS()
        }
        
        AsyncFunction("syncIOS") { () async throws -> Bool in
            logDebug("syncIOS called")
            return try await self.iapModule.syncIOS()
        }
        
        AsyncFunction("presentCodeRedemptionSheetIOS") { () async throws -> Bool in
            logDebug("presentCodeRedemptionSheetIOS called")
            return try await self.iapModule.presentCodeRedemptionSheetIOS()
        }
        
        AsyncFunction("showManageSubscriptionsIOS") { () async throws -> Bool in
            logDebug("showManageSubscriptionsIOS called")
            return try await self.iapModule.showManageSubscriptionsIOS()
        }
        
        AsyncFunction("isTransactionVerifiedIOS") { (sku: String) async -> Bool in
            logDebug("isTransactionVerifiedIOS called for sku: \(sku)")
            return await self.iapModule.isTransactionVerifiedIOS(sku: sku)
        }
    }
    
    // MARK: - Purchase Listeners
    
    private func setupPurchaseListeners() {
        iapModule.addPurchaseUpdatedListener { [weak self] purchase in
            self?.handlePurchaseUpdated(purchase)
        }
        iapModule.addPurchaseErrorListener { [weak self] error in
            self?.handlePurchaseError(error)
        }
    }
    
    private func handlePurchaseUpdated(_ purchase: OpenIapPurchase) {
        logDebug("Purchase updated: \(purchase.productId)")
        let serialized = serializePurchase(purchase)
        sendEvent(IapEvent.PurchaseUpdated, serialized)
    }
    
    private func handlePurchaseError(_ error: OpenIapError) {
        logDebug("Purchase error: \(error)")
        let serialized: [String: Any?] = [
            "code": "E_PURCHASE_ERROR",
            "message": error.localizedDescription
        ]
        sendEvent(IapEvent.PurchaseError, serialized)
    }
    
    // MARK: - Serialization Helpers
    
    private func mapPeriodUnit(_ unit: OpenIapProduct.SubscriptionPeriod.PeriodUnit?) -> String {
        guard let unit = unit else { return "" }
        switch unit {
        case .day:
            return "DAY"
        case .week:
            return "WEEK"
        case .month:
            return "MONTH"
        case .year:
            return "YEAR"
        }
    }
    
    private func mapPaymentMode(_ mode: OpenIapProduct.IntroductoryOffer.PaymentMode?) -> String {
        guard let mode = mode else { return "" }
        switch mode {
        case .freeTrial:
            return "FREETRIAL"
        case .payAsYouGo:
            return "PAYASYOUGO"
        case .payUpFront:
            return "PAYUPFRONT"
        }
    }
    
    private func serializePurchase(_ purchase: OpenIapPurchase) -> [String: Any?] {
        return [
            // PurchaseCommon required fields
            "id": purchase.id,
            "productId": purchase.productId,
            "transactionDate": purchase.purchaseTime.timeIntervalSince1970 * 1000,
            "transactionReceipt": purchase.purchaseToken,
            "purchaseToken": purchase.purchaseToken,
            "platform": "ios",
            
            // PurchaseCommon optional fields
            "ids": nil, // Multiple product ids if applicable
            "transactionId": purchase.transactionId, // deprecated but kept for backward compatibility
            
            // PurchaseIOS specific fields
            "quantityIOS": purchase.quantity,
            "originalTransactionDateIOS": purchase.originalPurchaseTime.map { $0.timeIntervalSince1970 * 1000 },
            "originalTransactionIdentifierIOS": purchase.originalTransactionId,
            "appAccountToken": purchase.appAccountToken,
            
            // Additional iOS fields from StoreKit 2
            "expirationDateIOS": purchase.expiryTime.map { $0.timeIntervalSince1970 * 1000 },
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
            "revocationDateIOS": purchase.revocationDateIOS.map { $0.timeIntervalSince1970 * 1000 },
            "revocationReasonIOS": purchase.revocationReasonIOS,
            
            // Offer information
            "offerIOS": purchase.offerIOS != nil ? [
                "id": purchase.offerIOS!.id,
                "type": purchase.offerIOS!.type,
                "paymentMode": purchase.offerIOS!.paymentMode
            ] : nil,
            
            // Price locale fields
            "currencyCodeIOS": purchase.currencyCodeIOS,
            "currencySymbolIOS": purchase.currencySymbolIOS,
            "countryCodeIOS": purchase.countryCodeIOS,
            
            // Deprecated but kept for backward compatibility
            "jwsRepresentationIOS": purchase.jwsRepresentation
        ]
    }
    
    private func serializeProduct(_ product: OpenIapProduct) -> [String: Any?] {
        return [
            // Common fields (required by ProductCommon)
            "id": product.id,
            "title": product.title,
            "description": product.description,
            "type": product.type,
            "displayName": product.displayName, // Optional field
            "displayPrice": product.displayPrice,
            "currency": product.currencyCode ?? "USD",
            "price": product.priceIOS, // Optional field
            "debugDescription": "Product: \(product.id) - \(product.title) (\(product.displayPrice))", // Optional field
            "platform": product.platform, // Optional field but important for platform identification
            
            // iOS-specific fields (required by ProductIOS)
            "displayNameIOS": product.displayNameIOS,
            "isFamilyShareableIOS": product.isFamilyShareableIOS,
            "jsonRepresentationIOS": product.jsonRepresentationIOS,
            
            // Additional iOS-specific fields
            "descriptionIOS": product.descriptionIOS,  
            "displayPriceIOS": product.displayPriceIOS,
            "priceIOS": product.priceIOS,
            
            // subscriptionInfoIOS - map subscription information if available
            "subscriptionInfoIOS": product.subscriptionPeriod != nil ? [
                "subscriptionPeriod": [
                    "unit": mapPeriodUnit(product.subscriptionPeriod?.unit),
                    "value": product.subscriptionPeriod?.value ?? 0
                ],
                "subscriptionGroupId": product.subscriptionGroupId ?? "",
                "introductoryOffer": product.introductoryPrice != nil ? [
                    "displayPrice": product.introductoryPrice!.localizedPrice,
                    "id": product.introductoryPrice!.id ?? "",
                    "paymentMode": mapPaymentMode(product.introductoryPrice!.paymentMode),
                    "period": [
                        "unit": mapPeriodUnit(product.introductoryPrice!.period.unit),
                        "value": product.introductoryPrice!.period.value
                    ],
                    "periodCount": product.introductoryPrice!.numberOfPeriods,
                    "price": NSDecimalNumber(decimal: product.introductoryPrice!.price).doubleValue,
                    "type": "introductory"
                ] : nil,
                "promotionalOffers": product.discounts?.map { discount in
                    [
                        "displayPrice": discount.localizedPrice,
                        "id": discount.identifier,
                        "paymentMode": discount.paymentMode,
                        "period": [
                            "unit": mapPeriodUnit(discount.period?.unit),
                            "value": discount.period?.value ?? 0
                        ],
                        "periodCount": discount.numberOfPeriods,
                        "price": NSDecimalNumber(decimal: discount.price).doubleValue,
                        "type": "promotional"
                    ]
                } ?? []
            ] : nil,
            
            // Deprecated fields for backward compatibility  
            "isFamilyShareable": product.isFamilyShareable ?? false,
            "jsonRepresentation": product.jsonRepresentation ?? ""
        ]
    }
    
}