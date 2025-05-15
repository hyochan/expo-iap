import ExpoModulesCore
import StoreKit

func serializeDebug(_ s: String) -> String? {
    #if DEBUG
        return s
    #else
        return nil
    #endif
}

struct IapEvent {
    static let PurchaseUpdated = "purchase-updated"
    static let PurchaseError = "purchase-error"
    static let TransactionIapUpdated = "iap-transaction-updated"
}

@available(iOS 15.0, *)
func serializeTransaction(_ transaction: Transaction, jwsRepresentationIos: String? = nil) -> [String: Any?] {
    let isSubscription =
        transaction.productType.rawValue.lowercased().contains("renewable")
        || transaction.expirationDate != nil

    var transactionReasonIos: String? = nil
    var webOrderLineItemId: Int? = nil
    var jsonData: [String: Any]? = nil
    var jwsReceipt: String = ""

    let jsonRep = transaction.jsonRepresentation
    jwsReceipt = String(data: jsonRep, encoding: .utf8) ?? ""

    do {
        if let jsonObj = try JSONSerialization.jsonObject(with: jsonRep) as? [String: Any] {
            jsonData = jsonObj
            transactionReasonIos = jsonObj["transactionReason"] as? String
            if let webOrderId = jsonObj["webOrderLineItemID"] as? NSNumber {
                webOrderLineItemId = webOrderId.intValue
            }
        }
    } catch {
        print("Error parsing JSON representation: \(error)")
    }

    var purchaseMap: [String: Any?] = [
        "id": transaction.productID,
        "ids": [transaction.productID],
        "transactionId": String(transaction.id),
        "transactionDate": transaction.purchaseDate.timeIntervalSince1970 * 1000,
        "transactionReceipt": jwsReceipt,
        "platform": "ios",

        "quantityIos": transaction.purchasedQuantity,
        "originalTransactionDateIos": transaction.originalPurchaseDate.timeIntervalSince1970 * 1000,
        "originalTransactionIdentifierIos": transaction.originalID,
        "appAccountToken": transaction.appAccountToken?.uuidString,

        "appBundleIdIos": transaction.appBundleID,
        "productTypeIos": transaction.productType.rawValue,
        "subscriptionGroupIdIos": transaction.subscriptionGroupID,

        "webOrderLineItemIdIos": webOrderLineItemId,

        "expirationDateIos": transaction.expirationDate.map { $0.timeIntervalSince1970 * 1000 },

        "isUpgradedIos": transaction.isUpgraded,
        "ownershipTypeIos": transaction.ownershipType.rawValue,

        "revocationDateIos": transaction.revocationDate.map { $0.timeIntervalSince1970 * 1000 },
        "revocationReasonIos": transaction.revocationReason?.rawValue,
        "transactionReasonIos": transactionReasonIos,
    ]

    if (jwsRepresentationIos != nil) {
        purchaseMap["jwsRepresentationIos"] = jwsRepresentationIos
    }
    
    if #available(iOS 16.0, *) {
        purchaseMap["environmentIos"] = transaction.environment.rawValue
    }

    if #available(iOS 17.0, *) {
        purchaseMap["storefrontCountryCodeIos"] = transaction.storefront.countryCode
        purchaseMap["reasonIos"] = transaction.reason.rawValue
    }

    if #available(iOS 17.2, *) {
        if let offer = transaction.offer {
            purchaseMap["offerIos"] = [
                "id": offer.id,
                "type": offer.type.rawValue,
                "paymentMode": offer.paymentMode?.rawValue ?? "",
            ]
        }
    }

    if #available(iOS 15.4, *), let jsonData = jsonData {
        if let price = jsonData["price"] as? NSNumber {
            purchaseMap["priceIos"] = price.doubleValue
        }
        if let currency = jsonData["currency"] as? String {
            purchaseMap["currencyIos"] = currency
        }
    }

    return purchaseMap
}

@available(iOS 15.0, *)
func serializeProduct(_ p: Product) -> [String: Any?] {
    return [
        "debugDescription": serializeDebug(p.debugDescription),
        "description": p.description,
        "displayName": p.displayName,
        "displayPrice": p.displayPrice,
        "id": p.id,
        "title": p.displayName,
        "isFamilyShareable": p.isFamilyShareable,
        "jsonRepresentation": serializeDebug(
            String(data: p.jsonRepresentation, encoding: .utf8) ?? ""),
        "price": p.price,
        "subscription": p.subscription,
        "type": p.type,
        "currency": p.priceFormatStyle.currencyCode,
        "platform": "ios",
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
    private var subscriptionPollingTask: Task<Void, Error>?
    private var pollingSkus: Set<String> = []

    public func definition() -> ModuleDefinition {
        Name("ExpoIap")

        Constants([
            "PI": Double.pi
        ])

        Events(IapEvent.PurchaseUpdated, IapEvent.PurchaseError, IapEvent.TransactionIapUpdated)

        OnStartObserving {
            self.hasListeners = true
            self.addTransactionObserver()
        }

        OnStopObserving {
            self.hasListeners = false
            self.removeTransactionObserver()
        }

        Function("initConnection") { () -> Bool in
            self.productStore = ProductStore()
            return AppStore.canMakePayments
        }

        AsyncFunction("getItems") { (skus: [String]) -> [[String: Any?]?] in
            guard let productStore = self.productStore else {
                throw NSError(
                    domain: "ExpoIapModule", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }

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
            guard let productStore = self.productStore else {
                return false
            }
            await productStore.removeAll()
            self.transactions.removeAll()
            self.productStore = nil
            self.removeTransactionObserver()
            return true
        }

        AsyncFunction("getAvailableItems") {
            (alsoPublishToEventListener: Bool, onlyIncludeActiveItems: Bool) -> [[String: Any?]?] in
            var purchasedItemsSerialized: [[String: Any?]] = []

            func addTransaction(transaction: Transaction, jwsRepresentationIos: String? = nil) {
                purchasedItemsSerialized.append(serializeTransaction(transaction, jwsRepresentationIos: jwsRepresentationIos))
                if alsoPublishToEventListener {
                    self.sendEvent(IapEvent.PurchaseUpdated, serializeTransaction(transaction, jwsRepresentationIos: jwsRepresentationIos))
                }
            }

            func addError(error: Error, errorDict: [String: String]) {
                if alsoPublishToEventListener {
                    self.sendEvent(IapEvent.PurchaseError, errorDict)
                }
            }

            for await verification in onlyIncludeActiveItems
                ? Transaction.currentEntitlements : Transaction.all
            {
                do {
                    let transaction = try self.checkVerified(verification)
                    if !onlyIncludeActiveItems {
                        addTransaction(transaction: transaction, jwsRepresentationIos: verification.jwsRepresentation)
                        continue
                    }
                    switch transaction.productType {
                    case .nonConsumable, .autoRenewable, .consumable:
                        if await self.productStore?.getProduct(productID: transaction.productID)
                            != nil
                        {
                            addTransaction(transaction: transaction, jwsRepresentationIos: verification.jwsRepresentation)
                        }
                    case .nonRenewable:
                        if await self.productStore?.getProduct(productID: transaction.productID)
                            != nil
                        {
                            let currentDate = Date()
                            let expirationDate = Calendar(identifier: .gregorian).date(
                                byAdding: DateComponents(year: 1), to: transaction.purchaseDate)!
                            if currentDate < expirationDate {
                                addTransaction(transaction: transaction, jwsRepresentationIos: verification.jwsRepresentation)
                            }
                        }
                    default:
                        break
                    }
                } catch StoreError.failedVerification {
                    let err = [
                        "responseCode": IapErrors.E_TRANSACTION_VALIDATION_FAILED.rawValue,
                        "debugMessage": StoreError.failedVerification.localizedDescription,
                        "code": IapErrors.E_TRANSACTION_VALIDATION_FAILED.rawValue,
                        "message": StoreError.failedVerification.localizedDescription,
                        "productId": "unknown",
                    ]
                    addError(error: StoreError.failedVerification, errorDict: err)
                } catch {
                    let err = [
                        "responseCode": IapErrors.E_UNKNOWN.rawValue,
                        "debugMessage": error.localizedDescription,
                        "code": IapErrors.E_UNKNOWN.rawValue,
                        "message": error.localizedDescription,
                        "productId": "unknown",
                    ]
                    addError(error: error, errorDict: err)
                }
            }

            return purchasedItemsSerialized
        }

        AsyncFunction("buyProduct") {
            (
                sku: String, andDangerouslyFinishTransactionAutomatically: Bool,
                appAccountToken: String?, quantity: Int, discountOffer: [String: String]?
            ) -> [String: Any?]? in
            guard let productStore = self.productStore else {
                throw NSError(
                    domain: "ExpoIapModule", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }

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
                        throw NSError(
                            domain: "ExpoIapModule", code: 2,
                            userInfo: [NSLocalizedDescriptionKey: "Could not find window scene"])
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
                        if andDangerouslyFinishTransactionAutomatically {
                            await transaction.finish()
                            return nil
                        } else {
                            self.transactions[String(transaction.id)] = transaction
                            let serialized = serializeTransaction(transaction, jwsRepresentationIos: verification.jwsRepresentation)
                            self.sendEvent(IapEvent.PurchaseUpdated, serialized)
                            return serialized
                        }
                    case .userCancelled:
                        throw NSError(
                            domain: "ExpoIapModule", code: 3,
                            userInfo: [NSLocalizedDescriptionKey: "User cancelled the purchase"])
                    case .pending:
                        throw NSError(
                            domain: "ExpoIapModule", code: 4,
                            userInfo: [NSLocalizedDescriptionKey: "The payment was deferred"])
                    @unknown default:
                        throw NSError(
                            domain: "ExpoIapModule", code: 5,
                            userInfo: [NSLocalizedDescriptionKey: "Unknown purchase result"])
                    }
                } catch {
                    throw NSError(
                        domain: "ExpoIapModule", code: 6,
                        userInfo: [
                            NSLocalizedDescriptionKey:
                                "Purchase failed: \(error.localizedDescription)"
                        ])
                }
            } else {
                throw NSError(
                    domain: "ExpoIapModule", code: 7,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid product ID"])
            }
        }

        AsyncFunction("isEligibleForIntroOffer") { (groupID: String) -> Bool in
            return await Product.SubscriptionInfo.isEligibleForIntroOffer(for: groupID)
        }

        AsyncFunction("subscriptionStatus") { (sku: String) -> [[String: Any?]?]? in
            guard let productStore = self.productStore else {
                throw NSError(
                    domain: "ExpoIapModule", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }

            do {
                let product = await productStore.getProduct(productID: sku)
                let status: [Product.SubscriptionInfo.Status]? = try await product?.subscription?
                    .status
                guard let status = status else {
                    return nil
                }
                return status.map { serializeSubscriptionStatus($0) }
            } catch {
                throw NSError(
                    domain: "ExpoIapModule", code: 2,
                    userInfo: [
                        NSLocalizedDescriptionKey:
                            "Error getting subscription status: \(error.localizedDescription)"
                    ])
            }
        }

        AsyncFunction("currentEntitlement") { (sku: String) -> [String: Any?]? in
            guard let productStore = self.productStore else {
                throw NSError(
                    domain: "ExpoIapModule", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }

            if let product = await productStore.getProduct(productID: sku) {
                if let result = await product.currentEntitlement {
                    do {
                        let transaction = try self.checkVerified(result)
                        return serializeTransaction(transaction)
                    } catch StoreError.failedVerification {
                        throw NSError(
                            domain: "ExpoIapModule", code: 2,
                            userInfo: [
                                NSLocalizedDescriptionKey:
                                    "Failed to verify transaction for sku \(sku)"
                            ])
                    } catch {
                        throw NSError(
                            domain: "ExpoIapModule", code: 3,
                            userInfo: [
                                NSLocalizedDescriptionKey:
                                    "Error fetching entitlement for sku \(sku): \(error.localizedDescription)"
                            ])
                    }
                } else {
                    throw NSError(
                        domain: "ExpoIapModule", code: 4,
                        userInfo: [
                            NSLocalizedDescriptionKey: "Can't find entitlement for sku \(sku)"
                        ])
                }
            } else {
                throw NSError(
                    domain: "ExpoIapModule", code: 5,
                    userInfo: [NSLocalizedDescriptionKey: "Can't find product for sku \(sku)"])
            }
        }

        AsyncFunction("latestTransaction") { (sku: String) -> [String: Any?]? in
            guard let productStore = self.productStore else {
                throw NSError(
                    domain: "ExpoIapModule", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }

            if let product = await productStore.getProduct(productID: sku) {
                if let result = await product.latestTransaction {
                    do {
                        let transaction = try self.checkVerified(result)
                        return serializeTransaction(transaction)
                    } catch StoreError.failedVerification {
                        throw NSError(
                            domain: "ExpoIapModule", code: 2,
                            userInfo: [
                                NSLocalizedDescriptionKey:
                                    "Failed to verify transaction for sku \(sku)"
                            ])
                    } catch {
                        throw NSError(
                            domain: "ExpoIapModule", code: 3,
                            userInfo: [
                                NSLocalizedDescriptionKey:
                                    "Error fetching latest transaction for sku \(sku): \(error.localizedDescription)"
                            ])
                    }
                } else {
                    throw NSError(
                        domain: "ExpoIapModule", code: 4,
                        userInfo: [
                            NSLocalizedDescriptionKey:
                                "Can't find latest transaction for sku \(sku)"
                        ])
                }
            } else {
                throw NSError(
                    domain: "ExpoIapModule", code: 5,
                    userInfo: [NSLocalizedDescriptionKey: "Can't find product for sku \(sku)"])
            }
        }

        AsyncFunction("finishTransaction") { (transactionIdentifier: String) -> Bool in
            if let transaction = self.transactions[transactionIdentifier] {
                await transaction.finish()
                self.transactions.removeValue(forKey: transactionIdentifier)
                return true
            } else {
                throw NSError(
                    domain: "ExpoIapModule", code: 8,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid transaction ID"])
            }
        }

        AsyncFunction("getPendingTransactions") { () -> [[String: Any?]?] in
            return self.transactions.values.map { serializeTransaction($0) }
        }

        AsyncFunction("sync") { () -> Bool in
            do {
                try await AppStore.sync()
                return true
            } catch {
                throw NSError(
                    domain: "ExpoIapModule", code: 9,
                    userInfo: [
                        NSLocalizedDescriptionKey:
                            "Error synchronizing with the AppStore: \(error.localizedDescription)"
                    ])
            }
        }

        AsyncFunction("presentCodeRedemptionSheet") { () -> Bool in
            #if !os(tvOS)
                SKPaymentQueue.default().presentCodeRedemptionSheet()
                return true
            #else
                throw NSError(
                    domain: "ExpoIapModule", code: 10,
                    userInfo: [NSLocalizedDescriptionKey: "This method is not available on tvOS"])
            #endif
        }

        AsyncFunction("showManageSubscriptions") { () -> Bool in
            #if !os(tvOS)
                guard let windowScene = await self.currentWindowScene() else {
                    throw NSError(
                        domain: "ExpoIapModule", code: 11,
                        userInfo: [
                            NSLocalizedDescriptionKey:
                                "Cannot find window scene or not available on macOS"
                        ])
                }
                
                // Get all subscription products before showing the management UI
                let subscriptionSkus = await self.getAllSubscriptionProductIds()
                self.pollingSkus = Set(subscriptionSkus)
                
                // Show the management UI
                try await AppStore.showManageSubscriptions(in: windowScene)
                
                // Start polling for status changes
                self.pollForSubscriptionStatusChanges()
                
                return true
            #else
                throw NSError(
                    domain: "ExpoIapModule", code: 12,
                    userInfo: [NSLocalizedDescriptionKey: "This method is not available on tvOS"])
            #endif
        }

        AsyncFunction("clearTransaction") { () -> Void in
            Task {
                for await result in Transaction.unfinished {
                    do {
                        let transaction = try self.checkVerified(result)
                        await transaction.finish()
                        self.transactions.removeValue(forKey: String(transaction.id))
                    } catch {
                        print("Failed to finish transaction")
                    }
                }
            }
        }

        AsyncFunction("beginRefundRequest") { (sku: String) -> String? in
            #if !os(tvOS)
                guard let product = await self.productStore?.getProduct(productID: sku),
                    let result = await product.latestTransaction
                else {
                    throw NSError(
                        domain: "ExpoIapModule", code: 5,
                        userInfo: [
                            NSLocalizedDescriptionKey:
                                "Can't find product or transaction for sku \(sku)"
                        ])
                }

                do {
                    let transaction = try self.checkVerified(result)
                    guard let windowScene = await self.currentWindowScene() else {
                        throw NSError(
                            domain: "ExpoIapModule", code: 11,
                            userInfo: [
                                NSLocalizedDescriptionKey:
                                    "Cannot find window scene or not available on macOS"
                            ])
                    }
                    let refundStatus = try await transaction.beginRefundRequest(in: windowScene)
                    return serialize(refundStatus)
                } catch StoreError.failedVerification {
                    throw NSError(
                        domain: "ExpoIapModule", code: 2,
                        userInfo: [
                            NSLocalizedDescriptionKey: "Failed to verify transaction for sku \(sku)"
                        ])
                } catch {
                    throw NSError(
                        domain: "ExpoIapModule", code: 3,
                        userInfo: [
                            NSLocalizedDescriptionKey:
                                "Failed to refund purchase: \(error.localizedDescription)"
                        ])
                }
            #else
                throw NSError(
                    domain: "ExpoIapModule", code: 12,
                    userInfo: [NSLocalizedDescriptionKey: "This method is not available on tvOS"])
            #endif
        }

        Function("disable") { () -> Bool in
            self.removeTransactionObserver()
            return true
        }

        AsyncFunction("getReceiptData") { () -> String? in
            return try self.getReceiptDataInternal()
        }
        
        AsyncFunction("isTransactionVerified") { (sku: String) -> Bool in
            guard let productStore = self.productStore else {
                throw NSError(
                    domain: "ExpoIapModule", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }
            
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
        
        AsyncFunction("getTransactionJws") { (sku: String) -> String? in
            guard let productStore = self.productStore else {
                throw NSError(
                    domain: "ExpoIapModule", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }
            
            if let product = await productStore.getProduct(productID: sku),
               let result = await product.latestTransaction {
                return result.jwsRepresentation
            } else {
                throw NSError(
                    domain: "ExpoIapModule", code: 5,
                    userInfo: [NSLocalizedDescriptionKey: "Can't find transaction for sku \(sku)"])
            }
        }
        
        AsyncFunction("validateReceiptIos") { (sku: String) -> [String: Any] in
            guard let productStore = self.productStore else {
                throw NSError(
                    domain: "ExpoIapModule", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }
            
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
                    latestTransaction = serializeTransaction(transaction, jwsRepresentationIos: result.jwsRepresentation)
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
                        let serialized = serializeTransaction(transaction)
                        self.sendEvent(IapEvent.PurchaseUpdated, serialized)
                        self.sendEvent(IapEvent.TransactionIapUpdated, ["transaction": serialized])
                    }
                } catch {
                    if self.hasListeners {
                        let err = [
                            "responseCode": IapErrors.E_TRANSACTION_VALIDATION_FAILED.rawValue,
                            "debugMessage": error.localizedDescription,
                            "code": IapErrors.E_TRANSACTION_VALIDATION_FAILED.rawValue,
                            "message": error.localizedDescription,
                        ]
                        self.sendEvent(IapEvent.PurchaseError, err)
                        self.sendEvent(IapEvent.TransactionIapUpdated, ["error": err])
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

    private func pollForSubscriptionStatusChanges() {
        subscriptionPollingTask?.cancel()
        
        subscriptionPollingTask = Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
            
            var previousStatuses: [String: Bool] = [:] // Track auto-renewal state with Bool
            
            for sku in self.pollingSkus {
                guard let product = await self.productStore?.getProduct(productID: sku),
                      let status = try? await product.subscription?.status.first else { continue }
                
                // Track willAutoRenew as a bool value
                var willAutoRenew = false
                if case .verified(let info) = status.renewalInfo {
                    willAutoRenew = info.willAutoRenew
                }
                previousStatuses[sku] = willAutoRenew
            }
            
            for _ in 1...5 {
                try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
                
                if Task.isCancelled {
                    return
                }
                
                for sku in self.pollingSkus {
                    guard let product = await self.productStore?.getProduct(productID: sku),
                          let status = try? await product.subscription?.status.first,
                          let result = await product.latestTransaction else { continue }
                    
                    // Try to verify the transaction
                    let transaction: Transaction
                    do {
                        transaction = try self.checkVerified(result)
                    } catch {
                        continue // Skip if verification fails
                    }
                    
                    // Track current auto-renewal state
                    var currentWillAutoRenew = false
                    if case .verified(let info) = status.renewalInfo {
                        currentWillAutoRenew = info.willAutoRenew
                    }
                    
                    // Compare with previous state
                    if let previousWillAutoRenew = previousStatuses[sku], 
                       previousWillAutoRenew != currentWillAutoRenew {
                        
                        var purchaseMap = serializeTransaction(transaction)
                        
                        if case .verified(let renewalInfo) = status.renewalInfo {
                            if let renewalInfoDict = serializeRenewalInfo(.verified(renewalInfo)) {
                                purchaseMap["renewalInfo"] = renewalInfoDict
                            }
                        }
                        
                        self.sendEvent(IapEvent.PurchaseUpdated, purchaseMap)
                        self.sendEvent(IapEvent.TransactionIapUpdated, ["transaction": purchaseMap])
                        
                        previousStatuses[sku] = currentWillAutoRenew
                    }
                }
            }
            
            self.pollingSkus.removeAll()
        }
    }
    
    private func getReceiptDataInternal() throws -> String {
        if let appStoreReceiptURL = Bundle.main.appStoreReceiptURL,
           FileManager.default.fileExists(atPath: appStoreReceiptURL.path) {
            do {
                let receiptData = try Data(contentsOf: appStoreReceiptURL, options: .alwaysMapped)
                return receiptData.base64EncodedString(options: [])
            } catch {
                throw NSError(
                    domain: "ExpoIapModule", code: 13,
                    userInfo: [
                        NSLocalizedDescriptionKey:
                            "Error reading receipt data: \(error.localizedDescription)"
                    ])
            }
        } else {
            throw NSError(
                domain: "ExpoIapModule", code: 14,
                userInfo: [NSLocalizedDescriptionKey: "App Store receipt not found"])
        }
    }
}
