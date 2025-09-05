import ExpoModulesCore
import OpenIAP

func logDebug(_ message: String) {
    #if DEBUG
        print("DEBUG - \(message)")
    #endif
}

struct OpenIapEvent {
    static let PurchaseUpdated = "purchase-updated"
    static let PurchaseError = "purchase-error"
    static let PromotedProductIOS = "promoted-product-ios"
}

@available(iOS 15.0, tvOS 15.0, *)
@MainActor
public class ExpoIapModule: Module {
    private let iapModule = OpenIapModule.shared
    private var hasListeners = false
    
    public func definition() -> ModuleDefinition {
        Name("ExpoIap")
        
        // Export native constants for error code mapping
        Constants([
            "ERROR_CODES": IapErrorCode.toDictionary()
        ])
        
        Events(OpenIapEvent.PurchaseUpdated, OpenIapEvent.PurchaseError, OpenIapEvent.PromotedProductIOS)
        
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
                // OpenIAP now exposes unified listener management
                await self.iapModule.removeAllListeners()
                self.hasListeners = false
            }
            
            return try await self.iapModule.endConnection()
        }
        
        AsyncFunction("fetchProducts") { (skus: [String]) async throws -> [[String: Any?]] in
            logDebug("fetchProducts called with skus: \(skus)")
            // Use ProductRequest for OpenIAP PR #3
            let request = ProductRequest(skus: skus, type: "all")
            let products = try await self.iapModule.fetchProducts(request)
            
            // Debug logging
            for product in products {
                logDebug("Product: id=\(product.id), title=\(product.title), description=\(product.description)")
                logDebug("Product: price=\(product.price ?? 0), displayPrice=\(product.displayPrice), currency=\(product.currency)")
                logDebug("Product: type=\(product.type), platform=\(product.platform)")
            }
            
            let serializedProducts = products.map { self.serializeProduct($0) }
            logDebug("Serialized products: \(serializedProducts)")
            return serializedProducts
        }
        
        AsyncFunction("getAvailableItems") {
            (alsoPublishToEventListenerIOS: Bool?, onlyIncludeActiveItemsIOS: Bool?) async throws -> [[String: Any?]] in
            logDebug("getAvailableItems called")
            // Use PurchaseOptions for OpenIAP PR #3
            let options = PurchaseOptions(
                alsoPublishToEventListenerIOS: alsoPublishToEventListenerIOS,
                onlyIncludeActiveItemsIOS: onlyIncludeActiveItemsIOS
            )
            let transactions = try await self.iapModule.getAvailablePurchases(options)
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
            
            // Use RequestPurchaseProps for OpenIAP PR #3
            let props = RequestPurchaseProps(
                sku: sku,
                andDangerouslyFinishTransactionAutomatically: finishAutomatically,
                appAccountToken: appAccountToken,
                quantity: qty,
                discountOffer: discountOffer
            )
            let purchase = try await self.iapModule.requestPurchase(props)
            return self.serializePurchase(purchase)
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
            // Use ReceiptValidationProps for OpenIAP PR #3
            let props = ReceiptValidationProps(sku: sku)
            let validation = try await self.iapModule.validateReceiptIOS(props)
            var result: [String: Any?] = [
                "isValid": validation.isValid,
                "receiptData": validation.receiptData,
                "jwsRepresentation": validation.jwsRepresentation
            ]
            if let latest = validation.latestTransaction {
                result["latestTransaction"] = self.serializePurchase(latest)
            }
            return result
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
                            "autoRenewPreference": status.renewalInfo!.autoRenewPreference as Any,
                            "expirationReason": status.renewalInfo!.expirationReason as Any,
                            "gracePeriodExpirationDate": status.renewalInfo!.gracePeriodExpirationDate.map { $0.timeIntervalSince1970 * 1000 } as Any
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
        _ = iapModule.purchaseUpdatedListener { [weak self] purchase in
            self?.handlePurchaseUpdated(purchase)
        }
        _ = iapModule.purchaseErrorListener { [weak self] error in
            self?.handlePurchaseError(error)
        }
    }
    
    private func handlePurchaseUpdated(_ purchase: OpenIapPurchase) {
        logDebug("Purchase updated: \(purchase.productId)")
        let serialized = serializePurchase(purchase)
        sendEvent(OpenIapEvent.PurchaseUpdated, serialized)
    }
    
    private func handlePurchaseError(_ error: PurchaseError) {
        logDebug("Purchase error: \(error)")
        let serialized: [String: Any?] = [
            "code": error.code,
            "message": error.message,
            "productId": error.productId as Any
        ]
        sendEvent(OpenIapEvent.PurchaseError, serialized)
    }
    
    // MARK: - Serialization Helpers
    
    private func serializePurchase(_ purchase: OpenIapPurchase) -> [String: Any?] {
        return [
            // PurchaseCommon required fields
            "id": purchase.id,
            "productId": purchase.productId,
            "transactionDate": purchase.transactionDate,
            "transactionReceipt": purchase.transactionReceipt,
            "purchaseToken": purchase.purchaseToken,
            "platform": purchase.platform,
            
            // PurchaseCommon optional fields
            "ids": purchase.ids,
            "transactionId": purchase.id, // deprecated but kept for backward compatibility
            "quantity": purchase.quantity,
            "purchaseState": purchase.purchaseState.rawValue,
            "isAutoRenewing": purchase.isAutoRenewing,
            
            // PurchaseIOS specific fields
            "quantityIOS": purchase.quantityIOS,
            "originalTransactionDateIOS": purchase.originalTransactionDateIOS,
            "originalTransactionIdentifierIOS": purchase.originalTransactionIdentifierIOS,
            "appAccountToken": purchase.appAccountToken,
            
            // Additional iOS fields from StoreKit 2
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
            
            // Offer information
            "offerIOS": purchase.offerIOS != nil ? [
                "id": purchase.offerIOS!.id,
                "type": purchase.offerIOS!.type,
                "paymentMode": purchase.offerIOS!.paymentMode
            ] : nil,
            
            // Price locale fields
            "currencyCodeIOS": purchase.currencyCodeIOS,
            "currencySymbolIOS": purchase.currencySymbolIOS,
            "countryCodeIOS": purchase.countryCodeIOS
        ]
    }
    
    private func serializeProduct(_ product: OpenIapProduct) -> [String: Any?] {
        var result: [String: Any?] = [
            // Common fields (required by ProductCommon)
            "id": product.id,
            "title": product.title,
            "description": product.description,
            "type": product.type,
            "displayName": product.displayName,
            "displayPrice": product.displayPrice,
            "currency": product.currency,
            "price": product.price,
            "debugDescription": product.debugDescription,
            "platform": product.platform,
            
            // iOS-specific fields (required by ProductIOS)
            "displayNameIOS": product.displayNameIOS,
            "isFamilyShareableIOS": product.isFamilyShareableIOS,
            "jsonRepresentationIOS": product.jsonRepresentationIOS,
            "typeIOS": product.typeIOS.rawValue,
            
            // Additional iOS-specific fields
            "descriptionIOS": product.description,  
            "displayPriceIOS": product.displayPrice,
            "priceIOS": product.price,
            
            // ProductSubscriptionIOS specific fields
            "discountsIOS": product.discountsIOS?.map { discount in
                [
                    "identifier": discount.identifier,
                    "type": discount.type,
                    "numberOfPeriods": discount.numberOfPeriods,
                    "price": discount.price,
                    "priceAmount": discount.priceAmount,
                    "paymentMode": discount.paymentMode,
                    "subscriptionPeriod": discount.subscriptionPeriod
                ]
            },
            "introductoryPriceIOS": product.introductoryPriceIOS,
            "introductoryPriceAsAmountIOS": product.introductoryPriceAsAmountIOS,
            "introductoryPricePaymentModeIOS": product.introductoryPricePaymentModeIOS,
            "introductoryPriceNumberOfPeriodsIOS": product.introductoryPriceNumberOfPeriodsIOS,
            "introductoryPriceSubscriptionPeriodIOS": product.introductoryPriceSubscriptionPeriodIOS,
            "subscriptionPeriodNumberIOS": product.subscriptionPeriodNumberIOS,
            "subscriptionPeriodUnitIOS": product.subscriptionPeriodUnitIOS
        ]
        
        // Add subscriptionInfoIOS if available
        if let subInfo = product.subscriptionInfoIOS {
            var subInfoDict: [String: Any?] = [
                "subscriptionGroupId": subInfo.subscriptionGroupId,
                "subscriptionPeriod": [
                    "unit": subInfo.subscriptionPeriod.unit.rawValue,
                    "value": subInfo.subscriptionPeriod.value
                ]
            ]
            
            if let intro = subInfo.introductoryOffer {
                subInfoDict["introductoryOffer"] = [
                    "displayPrice": intro.displayPrice,
                    "id": intro.id,
                    "paymentMode": intro.paymentMode.rawValue,
                    "period": [
                        "unit": intro.period.unit.rawValue,
                        "value": intro.period.value
                    ],
                    "periodCount": intro.periodCount,
                    "price": intro.price,
                    "type": intro.type.rawValue
                ]
            }
            
            if let promos = subInfo.promotionalOffers {
                subInfoDict["promotionalOffers"] = promos.map { offer in
                    [
                        "displayPrice": offer.displayPrice,
                        "id": offer.id,
                        "paymentMode": offer.paymentMode.rawValue,
                        "period": [
                            "unit": offer.period.unit.rawValue,
                            "value": offer.period.value
                        ],
                        "periodCount": offer.periodCount,
                        "price": offer.price,
                        "type": offer.type.rawValue
                    ]
                }
            }
            
            result["subscriptionInfoIOS"] = subInfoDict
        }
        
        // Deprecated fields for backward compatibility  
        result["isFamilyShareable"] = product.isFamilyShareableIOS
        result["jsonRepresentation"] = product.jsonRepresentationIOS
        
        return result
    }
    
}
