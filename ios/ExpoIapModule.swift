import ExpoModulesCore
import StoreKit

func serializeDebug(_ s: String) -> String? {
    #if DEBUG
        return s
    #else
        return nil
    #endif
}

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

@available(iOS 15.0, *)
func serializeTransaction(_ transaction: Transaction, jwsRepresentationIOS: String? = nil) -> [String: Any?] {
    let _ =
        transaction.productType.rawValue.lowercased().contains("renewable")
        || transaction.expirationDate != nil

    var transactionReasonIOS: String? = nil
    var webOrderLineItemId: Int? = nil
    var jsonData: [String: Any]? = nil
    var jwsReceipt: String = ""

    let jsonRep = transaction.jsonRepresentation
    jwsReceipt = String(data: jsonRep, encoding: .utf8) ?? ""

    do {
        if let jsonObj = try JSONSerialization.jsonObject(with: jsonRep) as? [String: Any] {
            jsonData = jsonObj
            transactionReasonIOS = jsonObj["transactionReason"] as? String
            if let webOrderId = jsonObj["webOrderLineItemID"] as? NSNumber {
                webOrderLineItemId = webOrderId.intValue
            }
        }
    } catch {
        print("Error parsing JSON representation: \(error)")
    }

    var purchaseMap: [String: Any?] = [
        "id": String(transaction.id),
        "productId": transaction.productID,
        "ids": [transaction.productID],
        "transactionId": String(transaction.id), // @deprecated - use id instead
        "transactionDate": transaction.purchaseDate.timeIntervalSince1970 * 1000,
        "transactionReceipt": jwsReceipt,
        "platform": "ios",

        "quantityIOS": transaction.purchasedQuantity,
        "originalTransactionDateIOS": transaction.originalPurchaseDate.timeIntervalSince1970 * 1000,
        "originalTransactionIdentifierIOS": String(transaction.originalID),
        "appAccountToken": transaction.appAccountToken?.uuidString,

        "appBundleIdIOS": transaction.appBundleID,
        "productTypeIOS": transaction.productType.rawValue,
        "subscriptionGroupIdIOS": transaction.subscriptionGroupID,

        "webOrderLineItemIdIOS": webOrderLineItemId,

        "expirationDateIOS": transaction.expirationDate.map { $0.timeIntervalSince1970 * 1000 },

        "isUpgradedIOS": transaction.isUpgraded,
        "ownershipTypeIOS": transaction.ownershipType.rawValue,

        "revocationDateIOS": transaction.revocationDate.map { $0.timeIntervalSince1970 * 1000 },
        "revocationReasonIOS": transaction.revocationReason?.rawValue,
        "transactionReasonIOS": transactionReasonIOS,
    ]

    if (jwsRepresentationIOS != nil) {
        logDebug("serializeTransaction adding jwsRepresentationIOS with length: \(jwsRepresentationIOS!.count)")
        purchaseMap["jwsRepresentationIOS"] = jwsRepresentationIOS
        purchaseMap["purchaseToken"] = jwsRepresentationIOS
    } else {
        logDebug("serializeTransaction jwsRepresentationIOS is nil")
    }
    
    if #available(iOS 16.0, *) {
        purchaseMap["environmentIOS"] = transaction.environment.rawValue
    }

    if #available(iOS 17.0, *) {
        purchaseMap["storefrontCountryCodeIOS"] = transaction.storefront.countryCode
        purchaseMap["reasonIOS"] = transaction.reason.rawValue
    }

    if #available(iOS 17.2, *) {
        if let offer = transaction.offer {
            purchaseMap["offerIOS"] = [
                "id": offer.id ?? "",
                "type": offer.type.rawValue,
                "paymentMode": offer.paymentMode?.rawValue ?? "",
            ]
        }
    }

    if #available(iOS 15.4, *), let jsonData = jsonData {
        if let price = jsonData["price"] as? NSNumber {
            // START: Deprecated - will be removed in v2.9.0
            // Use currencyCodeIOS, currencySymbolIOS, countryCodeIOS instead
            purchaseMap["priceIOS"] = price.doubleValue
            // END: Deprecated - will be removed in v2.9.0
        }
        if let currency = jsonData["currency"] as? String {
            purchaseMap["currencyCodeIOS"] = currency
            
            let locale = Locale(identifier: Locale.identifier(fromComponents: [NSLocale.Key.currencyCode.rawValue: currency]))
            purchaseMap["currencySymbolIOS"] = locale.currencySymbol
            
            // START: Deprecated - will be removed in v2.9.0
            // Use currencyCodeIOS instead
            purchaseMap["currencyIOS"] = currency
            // END: Deprecated - will be removed in v2.9.0
        }
        if let storefront = jsonData["storefront"] as? String {
            purchaseMap["countryCodeIOS"] = storefront
        }
    }

    return purchaseMap
}

private let DEFAULT_SUBSCRIPTION_PERIOD_UNIT = "DAY" // Default fallback unit for subscription periods.

func getPeriodIOS(_ unit: Product.SubscriptionPeriod.Unit) -> String {
    return switch (unit) {
    case .day: "DAY"
    case .week: "WEEK"
    case .month: "MONTH"
    case .year: "YEAR"
    @unknown default: 
        fatalError("Unknown subscription period unit: \(unit)")
    }
}

func serializeOffer(_ offer: Product.SubscriptionOffer?) -> [String: Any?]? {
    guard let offer = offer else { return nil }
    
    return [
        "id": offer.id,
        "period": [
            "unit": getPeriodIOS(offer.period.unit),
            "value": offer.period.value
        ],
        "periodCount": offer.periodCount,
        "paymentMode": offer.paymentMode.rawValue,
        "type": offer.type.rawValue,
        "price": offer.price,
        "displayPrice": offer.displayPrice,
    ]
}

func serializeSubscription(_ s: Product.SubscriptionInfo?) -> [String: Any?]? {
    guard let s = s else { return nil }
    return [
        "introductoryOffer": serializeOffer(s.introductoryOffer),
        "promotionalOffers": s.promotionalOffers.map(serializeOffer),
        "subscriptionGroupId": s.subscriptionGroupID,
        "subscriptionPeriod": [
            "unit": getPeriodIOS(s.subscriptionPeriod.unit),
            "value": s.subscriptionPeriod.value
        ],
    ]

}

@available(iOS 15.0, *)
func serializeProduct(_ p: Product) -> [String: Any?] {
    let productType: String = p.subscription != nil ? "subs" : "inapp"
    
    var discounts: [[String: Any?]]? = nil
    var introductoryPrice: String? = nil
    var introductoryPriceAsAmountIOS: String? = nil
    var introductoryPricePaymentModeIOS: String? = nil
    var introductoryPriceNumberOfPeriodsIOS: String? = nil
    var introductoryPriceSubscriptionPeriodIOS: String? = nil
    var subscriptionPeriodNumberIOS: String? = nil
    var subscriptionPeriodUnitIOS: String? = nil
    
    if let subscription = p.subscription {
        if !subscription.promotionalOffers.isEmpty {
            discounts = subscription.promotionalOffers.compactMap { offer in
                return [
                    "identifier": offer.id ?? "",
                    "type": offer.type.rawValue,
                    "numberOfPeriods": "\(offer.periodCount)",
                    "price": "\(offer.price)",
                    "localizedPrice": offer.displayPrice,
                    "paymentMode": offer.paymentMode.rawValue,
                    "subscriptionPeriod": getPeriodIOS(offer.period.unit)
                ]
            }
        }
        
        if let introOffer = subscription.introductoryOffer {
            introductoryPrice = introOffer.displayPrice
            introductoryPriceAsAmountIOS = "\(introOffer.price)"
            introductoryPricePaymentModeIOS = introOffer.paymentMode.rawValue
            introductoryPriceNumberOfPeriodsIOS = "\(introOffer.periodCount)"
            introductoryPriceSubscriptionPeriodIOS = getPeriodIOS(introOffer.period.unit)
        }
        
        subscriptionPeriodNumberIOS = "\(subscription.subscriptionPeriod.value)"
        subscriptionPeriodUnitIOS = getPeriodIOS(subscription.subscriptionPeriod.unit)
    }
    
    return [
        "debugDescription": serializeDebug(p.debugDescription),
        "description": p.description,
        "displayNameIOS": p.displayName,
        "discountsIOS": discounts,
        "introductoryPriceIOS": introductoryPrice,
        "introductoryPriceAsAmountIOS": introductoryPriceAsAmountIOS,
        "introductoryPricePaymentModeIOS": introductoryPricePaymentModeIOS,
        "introductoryPriceNumberOfPeriodsIOS": introductoryPriceNumberOfPeriodsIOS,
        "introductoryPriceSubscriptionPeriodIOS": introductoryPriceSubscriptionPeriodIOS,
        "subscriptionPeriodNumberIOS": subscriptionPeriodNumberIOS,
        "subscriptionPeriodUnitIOS": subscriptionPeriodUnitIOS,
        "displayPrice": p.displayPrice,
        "id": p.id,
        "title": p.displayName,
        "isFamilyShareableIOS": p.isFamilyShareable,
        "jsonRepresentationIOS": String(data: p.jsonRepresentation, encoding: .utf8),
        "price": p.price,
        "subscriptionInfoIOS": serializeSubscription(p.subscription),
        "type": productType,
        "currency": p.priceFormatStyle.currencyCode,
        "platform": "ios",
        // START: Deprecated - will be removed in v2.9.0
        // Use displayNameIOS instead of displayName
        "displayName": p.displayName,
        // Use discountsIOS instead of discounts
        "discounts": discounts,
        // Use introductoryPriceIOS instead of introductoryPrice
        "introductoryPrice": introductoryPrice,
        // Use isFamilyShareableIOS instead of isFamilyShareable
        "isFamilyShareable": p.isFamilyShareable,
        // Use jsonRepresentationIOS instead of jsonRepresentation
        "jsonRepresentation": String(data: p.jsonRepresentation, encoding: .utf8),
        // Use subscriptionInfoIOS instead of subscription
        "subscription": serializeSubscription(p.subscription),
        // END: Deprecated - will be removed in v2.9.0
    ]
}

@available(iOS 15.0, *)
@Sendable func serialize(_ rs: Transaction.RefundRequestStatus?) -> String? {
    guard let rs = rs else { return nil }
    switch rs {
    case .success: return "success"
    case .userCancelled: return "userCancelled"
    default:
        return nil
    }
}

@available(iOS 15.0, *)
func serializeSubscriptionStatus(_ status: Product.SubscriptionInfo.Status) -> [String: Any?] {
    return [
        "state": status.state.rawValue,
        "renewalInfo": serializeRenewalInfo(status.renewalInfo),
        "platform": "ios",
    ]
}

@available(iOS 15.0, *)
func serializeRenewalInfo(_ renewalInfo: VerificationResult<Product.SubscriptionInfo.RenewalInfo>)
    -> [String: Any?]?
{
    switch renewalInfo {
    case .unverified:
        return nil
    case .verified(let info):
        return [
            "autoRenewStatus": info.willAutoRenew,
            "autoRenewPreference": info.autoRenewPreference,
            "expirationReason": info.expirationReason,
            "deviceVerification": info.deviceVerification,
            "currentProductID": info.currentProductID,
            "debugDescription": info.debugDescription,
            "gracePeriodExpirationDate": info.gracePeriodExpirationDate,
            "platform": "ios",
        ]
    }
}

@available(iOS 15.0, *)
public class ExpoIapModule: Module {
    private var transactions: [String: Transaction] = [:]
    private var productStore: ProductStore?
    private var hasListeners = false
    private var updateListenerTask: Task<Void, Error>?
    private var paymentObserver: PaymentObserver?
    private var promotedPayment: SKPayment?
    private var promotedProduct: SKProduct?
    
    private let subscriptionChangePropagationDelay: UInt64 = 1_500_000_000 // 1.5 seconds in nanoseconds
    private var isInitialized = false

    public func definition() -> ModuleDefinition {
        Name("ExpoIap")

        Constants([
            "ERROR_CODES": IapErrorCode.toDictionary()
        ])

        Events(IapEvent.PurchaseUpdated, IapEvent.PurchaseError, IapEvent.PromotedProductIOS)

        OnStartObserving {
            self.hasListeners = true
            self.addTransactionObserver()
        }

        OnStopObserving {
            self.hasListeners = false
            self.removeTransactionObserver()
        }

        Function("initConnection") { () -> Bool in
            self.cleanupExistingState()
            
            self.productStore = ProductStore()
            
            if self.paymentObserver == nil {
                self.paymentObserver = PaymentObserver(module: self)
                SKPaymentQueue.default().add(self.paymentObserver!)
            }
            
            self.isInitialized = true
            return AppStore.canMakePayments
        }

        AsyncFunction("getStorefront") {
            let storefront = await Storefront.current
            return storefront?.countryCode
        }

        AsyncFunction("getAppTransactionIOS") { () async throws -> [String: Any?]? in
            if #available(iOS 16.0, *) {
                #if compiler(>=5.7)
                let verificationResult = try await AppTransaction.shared
                
                let appTransaction: AppTransaction
                switch verificationResult {
                case .verified(let verified):
                    appTransaction = verified
                case .unverified(_, _):
                    return nil
                }
                
                var result: [String: Any?] = [
                    "bundleId": appTransaction.bundleID,
                    "appVersion": appTransaction.appVersion,
                    "originalAppVersion": appTransaction.originalAppVersion,
                    "originalPurchaseDate": appTransaction.originalPurchaseDate.timeIntervalSince1970 * 1000,
                    "deviceVerification": appTransaction.deviceVerification.base64EncodedString(),
                    "deviceVerificationNonce": appTransaction.deviceVerificationNonce.uuidString,
                    "environment": appTransaction.environment.rawValue,
                    "signedDate": appTransaction.signedDate.timeIntervalSince1970 * 1000,
                    "appId": appTransaction.appID,
                    "appVersionId": appTransaction.appVersionID,
                    "preorderDate": appTransaction.preorderDate.map { $0.timeIntervalSince1970 * 1000 }
                ]
                
                // iOS 18.4+ properties - only compile with Xcode 16.4+ (Swift 6.1+)
                // This prevents build failures on Xcode 16.3 and below
                #if swift(>=6.1)
                if #available(iOS 18.4, *) {
                    result["appTransactionId"] = appTransaction.appTransactionID
                    result["originalPlatform"] = appTransaction.originalPlatform.rawValue
                }
                #endif
                
                return result
                #else
                throw Exception(
                    name: "ExpoIapModule",
                    description: "getAppTransaction requires Xcode 15.0+ with iOS 16.0 SDK for compilation",
                    code: IapErrorCode.unknown
                )
                #endif
            } else {
                throw Exception(
                    name: "ExpoIapModule",
                    description: "getAppTransaction requires iOS 16.0 or later",
                    code: IapErrorCode.unknown
                )
            }
        }
        
        AsyncFunction("getPromotedProductIOS") { () -> [String: Any?]? in
            guard let product = self.promotedProduct else {
                return nil
            }
            
            return [
                "productIdentifier": product.productIdentifier,
                "localizedTitle": product.localizedTitle,
                "localizedDescription": product.localizedDescription,
                "price": product.price.doubleValue,
                "priceLocale": [
                    "currencyCode": product.priceLocale.currencyCode ?? "",
                    "currencySymbol": product.priceLocale.currencySymbol ?? "",
                    "countryCode": product.priceLocale.regionCode ?? ""
                ]
            ]
        }
        
        AsyncFunction("requestPurchaseOnPromotedProductIOS") { () -> Void in
            guard let payment = self.promotedPayment else {
                throw Exception(
                    name: "ExpoIapModule",
                    description: "No promoted product available",
                    code: IapErrorCode.itemUnavailable
                )
            }
            
            SKPaymentQueue.default().add(payment)
            
            self.promotedPayment = nil
            self.promotedProduct = nil
        }

        AsyncFunction("fetchProducts") { (skus: [String]) -> [[String: Any?]?] in
            try self.ensureConnection()
            
            let productStore = self.productStore!
            
            do {
                let fetchedProducts = try await Product.products(for: skus)
                await productStore.performOnActor { isolatedStore in
                    fetchedProducts.forEach { product in
                        isolatedStore.addProduct(product)
                    }
                }
                let products = await productStore.getAllProducts()
                return products.map { serializeProduct($0) }.compactMap { $0 }
            } catch {
                print("Error fetching items: \(error)")
                throw error
            }
        }

        AsyncFunction("requestProducts") { (skus: [String]) -> [[String: Any?]?] in
            print("WARNING: requestProducts is deprecated. Use fetchProducts instead. The 'request' prefix should only be used for event-based operations. This method will be removed in version 3.0.0.")
            
            try self.ensureConnection()
            
            let productStore = self.productStore!
            
            do {
                let fetchedProducts = try await Product.products(for: skus)
                await productStore.performOnActor { isolatedStore in
                    fetchedProducts.forEach { product in
                        isolatedStore.addProduct(product)
                    }
                }
                let products = await productStore.getAllProducts()
                return products.map { serializeProduct($0) }.compactMap { $0 }
            } catch {
                print("Error fetching items: \(error)")
                throw error
            }
        }

        AsyncFunction("endConnection") { () -> Bool in
            self.cleanupExistingState()
            return true
        }

        AsyncFunction("getAvailableItems") {
            (alsoPublishToEventListenerIOS: Bool, onlyIncludeActiveItemsIOS: Bool) -> [[String: Any?]?] in
            
            try self.ensureConnection()
            
            var purchasedItemsSerialized: [[String: Any?]] = []

            func addTransaction(transaction: Transaction, jwsRepresentationIOS: String? = nil) {
                let serialized = serializeTransaction(transaction, jwsRepresentationIOS: jwsRepresentationIOS)
                purchasedItemsSerialized.append(serialized)
            }

            if onlyIncludeActiveItemsIOS {
                for await verification in Transaction.currentEntitlements {
                    do {
                        let transaction = try self.checkVerified(verification)
                        if await self.productStore?.getProduct(productID: transaction.productID) != nil {
                            addTransaction(transaction: transaction, jwsRepresentationIOS: verification.jwsRepresentation)
                        }
                    } catch {
                        print("[ExpoIapModule] Failed to verify transaction: \(error)")
                    }
                }
            } else {
                for await verification in Transaction.all {
                    do {
                        let transaction = try self.checkVerified(verification)
                        addTransaction(transaction: transaction, jwsRepresentationIOS: verification.jwsRepresentation)
                    } catch {
                        print("[ExpoIapModule] Failed to verify transaction: \(error)")
                    }
                }
            }
            return purchasedItemsSerialized
        }

        AsyncFunction("requestPurchase") {
            (
                sku: String, andDangerouslyFinishTransactionAutomatically: Bool,
                appAccountToken: String?, quantity: Int, discountOffer: [String: String]?
            ) -> [String: Any?]? in
            
            try self.ensureConnection()
            let productStore = self.productStore!

            let product: Product? = await productStore.getProduct(productID: sku)
            if let product = product {
                do {
                    var options: Set<Product.PurchaseOption> = []
                    if quantity > -1 {
                        options.insert(.quantity(quantity))
                    }
                    if let offerID = discountOffer?["identifier"],
                        let keyID = discountOffer?["keyIdentifier"],
                        let nonce = discountOffer?["nonce"],
                        let signature = discountOffer?["signature"],
                        let timestamp = discountOffer?["timestamp"],
                        let uuidNonce = UUID(uuidString: nonce),
                        let signatureData = Data(base64Encoded: signature),
                        let timestampInt = Int(timestamp)
                    {
                        options.insert(
                            .promotionalOffer(
                                offerID: offerID, keyID: keyID, nonce: uuidNonce,
                                signature: signatureData, timestamp: timestampInt))
                    }
                    if let appAccountToken = appAccountToken,
                        let appAccountUUID = UUID(uuidString: appAccountToken)
                    {
                        options.insert(.appAccountToken(appAccountUUID))
                    }
                    guard let windowScene = await self.currentWindowScene() else {
                        let errorData = [
                            "responseCode": IapErrorCode.serviceError,
                            "debugMessage": "Could not find window scene",
                            "code": IapErrorCode.serviceError,
                            "message": "Could not find window scene",
                            "productId": sku,
                        ]
                        self.sendEvent(IapEvent.PurchaseError, errorData)
                        throw Exception(name: "ExpoIapModule", description: "Could not find window scene", code: IapErrorCode.serviceError)
                    }
                    let result: Product.PurchaseResult
                    #if swift(>=5.9)
                        if #available(iOS 17.0, tvOS 17.0, *) {
                            result = try await product.purchase(
                                confirmIn: windowScene, options: options)
                        } else {
                            #if !os(visionOS)
                                result = try await product.purchase(options: options)
                            #endif
                        }
                    #elseif !os(visionOS)
                        result = try await product.purchase(options: options)
                    #endif

                    switch result {
                    case .success(let verification):
                        let transaction = try self.checkVerified(verification)
                        
                        let jwsRepresentation = verification.jwsRepresentation
                        if !jwsRepresentation.isEmpty {
                            logDebug("buyProduct JWS: exists")
                            logDebug("buyProduct JWS length: \(jwsRepresentation.count)")
                        } else {
                            logDebug("buyProduct JWS: empty string")
                        }
                        
                        if andDangerouslyFinishTransactionAutomatically {
                            await transaction.finish()
                            return nil
                        } else {
                            self.transactions[String(transaction.id)] = transaction
                            let serialized = serializeTransaction(transaction, jwsRepresentationIOS: verification.jwsRepresentation)
                            
                            logDebug("buyProduct serialized includes JWS: \(serialized["jwsRepresentationIOS"] != nil)")
                            
                            self.sendEvent(IapEvent.PurchaseUpdated, serialized)
                            return serialized
                        }
                    case .userCancelled:
                        let errorData = [
                            "responseCode": IapErrorCode.userCancelled,
                            "debugMessage": "User cancelled the purchase",
                            "code": IapErrorCode.userCancelled,
                            "message": "User cancelled the purchase",
                            "productId": sku,
                        ]
                        self.sendEvent(IapEvent.PurchaseError, errorData)
                        throw Exception(name: "ExpoIapModule", description: "User cancelled the purchase", code: IapErrorCode.userCancelled)
                    case .pending:
                        let errorData = [
                            "responseCode": IapErrorCode.deferredPayment,
                            "debugMessage": "The payment was deferred",
                            "code": IapErrorCode.deferredPayment,
                            "message": "The payment was deferred",
                            "productId": sku,
                        ]
                        self.sendEvent(IapEvent.PurchaseError, errorData)
                        throw Exception(name: "ExpoIapModule", description: "The payment was deferred", code: IapErrorCode.deferredPayment)
                    @unknown default:
                        let errorData = [
                            "responseCode": IapErrorCode.unknown,
                            "debugMessage": "Unknown purchase result",
                            "code": IapErrorCode.unknown,
                            "message": "Unknown purchase result",
                            "productId": sku,
                        ]
                        self.sendEvent(IapEvent.PurchaseError, errorData)
                        throw Exception(name: "ExpoIapModule", description: "Unknown purchase result", code: IapErrorCode.unknown)
                    }
                } catch {
                    if error is Exception {
                        throw error
                    }
                    
                    var errorCode = IapErrorCode.purchaseError
                    var errorMessage = error.localizedDescription
                    
                    if let nsError = error as NSError? {
                        switch nsError.domain {
                        case "SKErrorDomain":
                            switch nsError.code {
                            case 0: // SKError.unknown
                                errorCode = IapErrorCode.unknown
                            case 1: // SKError.clientInvalid
                                errorCode = IapErrorCode.serviceError
                            case 2: // SKError.paymentCancelled
                                errorCode = IapErrorCode.userCancelled
                                errorMessage = "User cancelled the purchase"
                            case 3: // SKError.paymentInvalid
                                errorCode = IapErrorCode.userError
                            case 4: // SKError.paymentNotAllowed
                                errorCode = IapErrorCode.userError
                                errorMessage = "Payment not allowed"
                            case 5: // SKError.storeProductNotAvailable
                                errorCode = IapErrorCode.itemUnavailable
                            case 6: // SKError.cloudServicePermissionDenied
                                errorCode = IapErrorCode.serviceError
                            case 7: // SKError.cloudServiceNetworkConnectionFailed
                                errorCode = IapErrorCode.networkError
                            case 8: // SKError.cloudServiceRevoked
                                errorCode = IapErrorCode.serviceError
                            default:
                                errorCode = IapErrorCode.purchaseError
                            }
                        case "NSURLErrorDomain":
                            errorCode = IapErrorCode.networkError
                            errorMessage = "Network error: \(error.localizedDescription)"
                        default:
                            errorCode = IapErrorCode.purchaseError
                        }
                    } else if error.localizedDescription.lowercased().contains("network") {
                        errorCode = IapErrorCode.networkError
                    } else if error.localizedDescription.lowercased().contains("cancelled") {
                        errorCode = IapErrorCode.userCancelled
                    }
                    
                    let errorData = [
                        "responseCode": errorCode,
                        "debugMessage": "Purchase failed: \(error.localizedDescription)",
                        "code": errorCode,
                        "message": errorMessage,
                        "productId": sku,
                    ]
                    self.sendEvent(IapEvent.PurchaseError, errorData)
                    throw Exception(name: "ExpoIapModule", description: errorMessage, code: errorCode)
                }
            } else {
                let errorData = [
                    "responseCode": IapErrorCode.itemUnavailable,
                    "debugMessage": "Invalid product ID",
                    "code": IapErrorCode.itemUnavailable,
                    "message": "Invalid product ID",
                    "productId": sku,
                ]
                self.sendEvent(IapEvent.PurchaseError, errorData)
                throw Exception(name: "ExpoIapModule", description: "Invalid product ID", code: IapErrorCode.itemUnavailable)
            }
        }

        AsyncFunction("isEligibleForIntroOfferIOS") { (groupID: String) -> Bool in
            return await Product.SubscriptionInfo.isEligibleForIntroOffer(for: groupID)
        }

        AsyncFunction("subscriptionStatusIOS") { (sku: String) -> [[String: Any?]?]? in
            try self.ensureConnection()
            let productStore = self.productStore!

            do {
                let product = await productStore.getProduct(productID: sku)
                let status: [Product.SubscriptionInfo.Status]? = try await product?.subscription?
                    .status
                guard let status = status else {
                    return nil
                }
                return status.map { serializeSubscriptionStatus($0) }
            } catch {
                if error is Exception {
                    throw error
                }
                throw Exception(name: "ExpoIapModule", description: "Error getting subscription status: \(error.localizedDescription)", code: IapErrorCode.serviceError)
            }
        }

        AsyncFunction("currentEntitlementIOS") { (sku: String) -> [String: Any?]? in
            try self.ensureConnection()
            let productStore = self.productStore!

            if let product = await productStore.getProduct(productID: sku) {
                if let result = await product.currentEntitlement {
                    do {
                        let transaction = try self.checkVerified(result)
                        return serializeTransaction(transaction)
                    } catch StoreError.failedVerification {
                        throw Exception(name: "ExpoIapModule", description: "Failed to verify transaction for sku \(sku)", code: IapErrorCode.transactionValidationFailed)
                    } catch {
                        if error is Exception {
                            throw error
                        }
                        throw Exception(name: "ExpoIapModule", description: "Error fetching entitlement for sku \(sku): \(error.localizedDescription)", code: IapErrorCode.serviceError)
                    }
                } else {
                    throw Exception(name: "ExpoIapModule", description: "Can't find entitlement for sku \(sku)", code: IapErrorCode.itemUnavailable)
                }
            } else {
                throw Exception(name: "ExpoIapModule", description: "Can't find product for sku \(sku)", code: IapErrorCode.itemUnavailable)
            }
        }

        AsyncFunction("latestTransactionIOS") { (sku: String) -> [String: Any?]? in
            try self.ensureConnection()
            let productStore = self.productStore!

            if let product = await productStore.getProduct(productID: sku) {
                if let result = await product.latestTransaction {
                    do {
                        let transaction = try self.checkVerified(result)
                        return serializeTransaction(transaction)
                    } catch StoreError.failedVerification {
                        throw Exception(name: "ExpoIapModule", description: "Failed to verify transaction for sku \(sku)", code: IapErrorCode.transactionValidationFailed)
                    } catch {
                        if error is Exception {
                            throw error
                        }
                        throw Exception(name: "ExpoIapModule", description: "Error fetching latest transaction for sku \(sku): \(error.localizedDescription)", code: IapErrorCode.serviceError)
                    }
                } else {
                    throw Exception(name: "ExpoIapModule", description: "Can't find latest transaction for sku \(sku)", code: IapErrorCode.itemUnavailable)
                }
            } else {
                throw Exception(name: "ExpoIapModule", description: "Can't find product for sku \(sku)", code: IapErrorCode.itemUnavailable)
            }
        }

        AsyncFunction("finishTransaction") { (transactionIdentifier: String) -> Bool in
            if let transaction = self.transactions[transactionIdentifier] {
                await transaction.finish()
                self.transactions.removeValue(forKey: transactionIdentifier)
                return true
            } else {
                throw Exception(name: "ExpoIapModule", description: "Invalid transaction ID", code: IapErrorCode.developerError)
            }
        }

        AsyncFunction("getPendingTransactionsIOS") { () -> [[String: Any?]?] in
            return self.transactions.values.map { serializeTransaction($0) }
        }

        AsyncFunction("syncIOS") { () -> Bool in
            do {
                try await AppStore.sync()
                return true
            } catch {
                if error is Exception {
                    throw error
                }
                throw Exception(name: "ExpoIapModule", description: "Error synchronizing with the AppStore: \(error.localizedDescription)", code: IapErrorCode.syncError)
            }
        }

        AsyncFunction("presentCodeRedemptionSheetIOS") { () -> Bool in
            #if !os(tvOS)
                SKPaymentQueue.default().presentCodeRedemptionSheet()
                return true
            #else
                throw Exception(name: "ExpoIapModule", description: "This method is not available on tvOS", code: IapErrorCode.serviceError)
            #endif
        }

        AsyncFunction("showManageSubscriptionsIOS") { () -> [[String: Any?]] in
            #if !os(tvOS)
                guard let windowScene = await self.currentWindowScene() else {
                    throw Exception(name: "ExpoIapModule", description: "Cannot find window scene or not available on macOS", code: IapErrorCode.serviceError)
                }
                
                var beforeStatuses: [String: Bool] = [:]
                let subscriptionSkus = await self.getAllSubscriptionProductIds()
                
                for sku in subscriptionSkus {
                    if let product = await self.productStore?.getProduct(productID: sku),
                       let subscription = product.subscription {
                        do {
                            let statuses = try await subscription.status
                            if let s = statuses.first(where: { status in
                                if case .verified(let info) = status.renewalInfo {
                                    return info.currentProductID == sku
                                }
                                return false
                            }) {
                                var willAutoRenew = false
                                if case .verified(let info) = s.renewalInfo {
                                    willAutoRenew = info.willAutoRenew
                                }
                                beforeStatuses[sku] = willAutoRenew
                            }
                        } catch {
                            // ignore
                        }
                    }
                }
                
                try await AppStore.showManageSubscriptions(in: windowScene)
                
                try? await Task.sleep(nanoseconds: subscriptionChangePropagationDelay)
                
                var updatedSubscriptions: [[String: Any?]] = []
                
                for sku in subscriptionSkus {
                    if let product = await self.productStore?.getProduct(productID: sku),
                       let subscription = product.subscription,
                       let result = await product.latestTransaction {
                        let statuses = try? await subscription.status
                        let matchedStatus = statuses?.first(where: { status in
                            if case .verified(let info) = status.renewalInfo {
                                return info.currentProductID == sku
                            }
                            return false
                        })
                        
                        var currentWillAutoRenew = false
                        if let s = matchedStatus, case .verified(let info) = s.renewalInfo {
                            currentWillAutoRenew = info.willAutoRenew
                        }
                        
                        let previousWillAutoRenew = beforeStatuses[sku] ?? false
                        if previousWillAutoRenew != currentWillAutoRenew {
                            do {
                                let transaction = try self.checkVerified(result)
                                var purchaseMap = serializeTransaction(transaction, jwsRepresentationIOS: result.jwsRepresentation)
                                purchaseMap["willAutoRenewIOS"] = currentWillAutoRenew
                                updatedSubscriptions.append(purchaseMap)
                            } catch {
                                print("[ExpoIapModule] Failed to verify subscription change: \(error)")
                            }
                        }
                    }
                }
                
                return updatedSubscriptions
            #else
                throw Exception(name: "ExpoIapModule", description: "This method is not available on tvOS", code: IapErrorCode.serviceError)
            #endif
        }

        AsyncFunction("clearTransactionIOS") { () -> Void in
            Task {
                for await result in Transaction.unfinished {
                    do {
                        let transaction = try self.checkVerified(result)
                        await transaction.finish()
                        self.transactions.removeValue(forKey: String(transaction.id))
                    } catch {
                        if error is Exception {
                            throw error
                        }
                        print("Failed to finish transaction")
                    }
                }
            }
        }

        AsyncFunction("beginRefundRequestIOS") { (sku: String) -> String? in
            #if !os(tvOS)
                try self.ensureConnection()
                let productStore = self.productStore!
                
                guard let product = await productStore.getProduct(productID: sku),
                    let result = await product.latestTransaction
                else {
                    throw Exception(name: "ExpoIapModule", description: "Can't find product or transaction for sku \(sku)", code: IapErrorCode.itemUnavailable)
                }

                do {
                    let transaction = try self.checkVerified(result)
                    guard let windowScene = await self.currentWindowScene() else {
                        throw Exception(name: "ExpoIapModule", description: "Cannot find window scene or not available on macOS", code: IapErrorCode.serviceError)
                    }
                    let refundStatus = try await transaction.beginRefundRequest(in: windowScene)
                    return serialize(refundStatus)
                } catch StoreError.failedVerification {
                    throw Exception(name: "ExpoIapModule", description: "Failed to verify transaction for sku \(sku)", code: IapErrorCode.transactionValidationFailed)
                } catch {
                    if error is Exception {
                        throw error
                    }
                    throw Exception(name: "ExpoIapModule", description: "Failed to refund purchase: \(error.localizedDescription)", code: IapErrorCode.serviceError)
                }
            #else
                throw Exception(name: "ExpoIapModule", description: "This method is not available on tvOS", code: IapErrorCode.serviceError)
            #endif
        }

        // @deprecated - This function is deprecated and will be removed in v2.9.0
        // The transaction observer is now managed automatically
        Function("disable") { () -> Bool in
            // No longer needed - observer management is automatic
            return true
        }

        AsyncFunction("getReceiptDataIOS") { () -> String? in
            return try self.getReceiptDataInternal()
        }

        AsyncFunction("isTransactionVerifiedIOS") { (sku: String) -> Bool in
            try self.ensureConnection()
            let productStore = self.productStore!
            
            if let product = await productStore.getProduct(productID: sku),
               let result = await product.latestTransaction {
                do {
                    // If this doesn't throw, the transaction is verified
                    _ = try self.checkVerified(result)
                    return true
                } catch {
                    return false
                }
            }
            return false
        }

        AsyncFunction("getTransactionJwsIOS") { (sku: String) -> String? in
            try self.ensureConnection()
            let productStore = self.productStore!
            
            if let product = await productStore.getProduct(productID: sku),
               let result = await product.latestTransaction {
                return result.jwsRepresentation
            } else {
                throw Exception(name: "ExpoIapModule", description: "Can't find transaction for sku \(sku)", code: IapErrorCode.itemUnavailable)
            }
        }

        AsyncFunction("validateReceiptIOS") { (sku: String) -> [String: Any] in
            try self.ensureConnection()
            let productStore = self.productStore!
            
            // Get receipt data
            var receiptData: String = ""
            do {
                receiptData = try self.getReceiptDataInternal()
            } catch {
                // Continue with validation even if receipt retrieval fails
                // Error will be reflected by empty receipt data
            }
            
            var isValid = false
            var jwsRepresentation: String? = nil
            var latestTransaction: [String: Any?]? = nil
            
            // Get JWS representation and verify transaction
            if let product = await productStore.getProduct(productID: sku),
               let result = await product.latestTransaction {
                jwsRepresentation = result.jwsRepresentation
                
                do {
                    // If this doesn't throw, the transaction is verified
                    let transaction = try self.checkVerified(result)
                    isValid = true
                    latestTransaction = serializeTransaction(transaction, jwsRepresentationIOS: result.jwsRepresentation)
                } catch {
                    isValid = false
                }
            }

            return [
                "isValid": isValid,
                "receiptData": receiptData,
                "jwsRepresentation": jwsRepresentation ?? "",
                "latestTransaction": latestTransaction as Any
            ]
        }
    }

    // Similar to Android's ensureConnection pattern
    private func ensureConnection() throws {
        guard isInitialized else {
            throw Exception(
                name: "ExpoIapModule", 
                description: "Connection not initialized. Call initConnection() first.", 
                code: IapErrorCode.notPrepared
            )
        }
        
        guard productStore != nil else {
            throw Exception(
                name: "ExpoIapModule", 
                description: "Product store not available", 
                code: IapErrorCode.notPrepared
            )
        }
    }
    
    private func cleanupExistingState() {
        // Cancel any existing tasks
        updateListenerTask?.cancel()
        updateListenerTask = nil
        
        // Clear collections
        transactions.removeAll()
        
        // Reset promoted products
        promotedPayment = nil
        promotedProduct = nil
        
        // Remove existing payment observer if any
        if let observer = paymentObserver {
            SKPaymentQueue.default().remove(observer)
            paymentObserver = nil
        }
        
        // Clear product store
        if let store = productStore {
            Task {
                await store.removeAll()
            }
        }
        productStore = nil
        
        isInitialized = false
    }
    
    private func addTransactionObserver() {
        if updateListenerTask == nil {
            updateListenerTask = listenForTransactions()
        }
    }

    private func removeTransactionObserver() {
        updateListenerTask?.cancel()
        updateListenerTask = nil
    }

    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached { [weak self] in
            guard let self = self else { return }
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    self.transactions[String(transaction.id)] = transaction
                    if self.hasListeners {
                        let serialized = serializeTransaction(transaction, jwsRepresentationIOS: result.jwsRepresentation)
                        self.sendEvent(IapEvent.PurchaseUpdated, serialized)
                    }
                } catch {
                    if self.hasListeners {
                        let err = [
                            "responseCode": IapErrorCode.transactionValidationFailed,
                            "debugMessage": error.localizedDescription,
                            "code": IapErrorCode.transactionValidationFailed,
                            "message": error.localizedDescription,
                        ]
                        self.sendEvent(IapEvent.PurchaseError, err)
                    }
                }
            }
        }
    }

    public func startObserving() {
        hasListeners = true
        addTransactionObserver()
    }

    public func stopObserving() {
        hasListeners = false
        removeTransactionObserver()
    }

    private func currentWindowScene() async -> UIWindowScene? {
        await MainActor.run {
            return UIApplication.shared.connectedScenes.first as? UIWindowScene
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let item):
            return item
        }
    }

    private func getAllSubscriptionProductIds() async -> [String] {
        guard let productStore = self.productStore else { return [] }
        let products = await productStore.getAllProducts()
        return products.compactMap { product in
            if product.subscription != nil {
                return product.id
            }
            return nil
        }
    }

    private func getReceiptDataInternal() throws -> String {
        if let appStoreReceiptURL = Bundle.main.appStoreReceiptURL,
           FileManager.default.fileExists(atPath: appStoreReceiptURL.path) {
            do {
                let receiptData = try Data(contentsOf: appStoreReceiptURL, options: .alwaysMapped)
                return receiptData.base64EncodedString(options: [])
            } catch {
                throw Exception(name: "ExpoIapModule", description: "Error reading receipt data: \(error.localizedDescription)", code: IapErrorCode.receiptFailed)
            }
        } else {
            throw Exception(name: "ExpoIapModule", description: "App Store receipt not found", code: IapErrorCode.receiptFailed)
        }
    }
    
    // Called by PaymentObserver when a promoted product is received
    func handlePromotedProduct(payment: SKPayment, product: SKProduct) {
        self.promotedPayment = payment
        self.promotedProduct = product
        
        if hasListeners {
            let productData: [String: Any] = [
                "productIdentifier": product.productIdentifier,
                "localizedTitle": product.localizedTitle,
                "localizedDescription": product.localizedDescription,
                "price": product.price.doubleValue,
                "priceLocale": [
                    "currencyCode": product.priceLocale.currencyCode ?? "",
                    "currencySymbol": product.priceLocale.currencySymbol ?? "",
                    "countryCode": product.priceLocale.regionCode ?? ""
                ]
            ]
            sendEvent(IapEvent.PromotedProductIOS, productData)
        }
    }
    
    // Ensure cleanup when module is deallocated
    deinit {
        cleanupExistingState()
    }
}

// PaymentObserver for handling promoted products
@available(iOS 15.0, *)
class PaymentObserver: NSObject, SKPaymentTransactionObserver {
    weak var module: ExpoIapModule?
    
    init(module: ExpoIapModule) {
        self.module = module
    }
    
    // Required by SKPaymentTransactionObserver protocol but not used
    func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        // We don't handle transactions here as StoreKit 2 handles them in ExpoIapModule
    }
    
    // Handle promoted products from App Store
    func paymentQueue(_ queue: SKPaymentQueue, shouldAddStorePayment payment: SKPayment, for product: SKProduct) -> Bool {
        module?.handlePromotedProduct(payment: payment, product: product)
        // Return false to defer the payment
        return false
    }
}
