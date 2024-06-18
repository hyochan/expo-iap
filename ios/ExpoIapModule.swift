import ExpoModulesCore
import StoreKit

func serializeProduct(_ p: Product) -> [String: Any?] {
    return [
        "debugDescription": p.debugDescription,
        "description": p.description,
        "displayName": p.displayName,
        "displayPrice": p.displayPrice,
        "id": p.id,
        "isFamilyShareable": p.isFamilyShareable,
        "jsonRepresentation": p.jsonRepresentation,
        "price": p.price,
        "subscription": p.subscription,
        "type": p.type,
        "currency": p.priceFormatStyle.currencyCode
    ]
}

func serializeTransaction(_ transaction: Transaction) -> [String: Any?] {
    return [
        "id": transaction.id,
        "productID": transaction.productID,
        "purchaseDate": transaction.purchaseDate,
        "expirationDate": transaction.expirationDate,
        "originalID": transaction.originalID
    ]
}

@available(iOS 15.0, *)
public class ExpoIapModule: Module, EXEventEmitter {
    private var transactions: [String: Any] = [:]
    private var productStore: ProductStore?
    private var hasListeners = false

    public func definition() -> ModuleDefinition {
        Name("ExpoIap")

        Constants([
            "PI": Double.pi
        ])

        Events("onChange", "purchase-updated", "purchase-error", "iap-transaction-updated")

        OnStartObserving {
            hasListeners = true
        }

        OnStopObserving {
            hasListeners = false
        }

        Function("hello") {
            return "Hello world! 👋"
        }

        Function("initConnection") {
            productStore = ProductStore()
            return AppStore.canMakePayments
        }

        AsyncFunction("getItems") { (skus: [String]) -> [[String: Any?]?] in
            guard let productStore = productStore else {
                throw NSError(domain: "ExpoIapModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }

            do {
                let fetchedProducts = try await Product.products(for: skus)

                await productStore.performOnActor { isolatedStore in
                    fetchedProducts.forEach({ product in
                        isolatedStore.addProduct(product)
                    })
                }

                let products = await productStore.getAllProducts()

                return products.map { (prod: Product) -> [String: Any?]? in
                    return serializeProduct(prod)
                }.compactMap { $0 }
            } catch {
                print("Error fetching items: \(error)")
                throw error
            }
        }

        AsyncFunction("endConnection") { () -> Bool in
            guard let productStore = productStore else {
                return false
            }

            await productStore.removeAll()
            transactions.removeAll()
            self.productStore = nil
            return true
        }

        AsyncFunction("buyProduct") { (sku: String, autoFinish: Bool, appAccountToken: String?, quantity: Int, offer: [String: String]) -> [String: Any?]? in
            guard let productStore = productStore else {
                throw NSError(domain: "ExpoIapModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Connection not initialized"])
            }

            let product: Product? = await productStore.getProduct(productID: sku)
            if let product = product {
                do {
                    var options: Set<Product.PurchaseOption> = []
                    if quantity > -1 {
                        options.insert(.quantity(quantity))
                    }
                    if let offerID = offer["offerID"], let keyID = offer["keyID"], let nonce = offer["nonce"], let signature = offer["signature"], let timestamp = offer["timestamp"], let uuidNonce = UUID(uuidString: nonce), let signatureData = signature.data(using: .utf8), let timestampInt = Int(timestamp) {
                        options.insert(.promotionalOffer(offerID: offerID, keyID: keyID, nonce: uuidNonce, signature: signatureData, timestamp: timestampInt))
                    }
                    if let appAccountToken = appAccountToken, let appAccountUUID = UUID(uuidString: appAccountToken) {
                        options.insert(.appAccountToken(appAccountUUID))
                    }
                    guard let windowScene = await currentWindowScene() else {
                        throw NSError(domain: "ExpoIapModule", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not find window scene"])
                    }
                    let result: Product.PurchaseResult
                    if #available(iOS 17.0, *) {
                        result = try await product.purchase(confirmIn: windowScene, options: options)
                    } else {
                        result = try await product.purchase(options: options)
                    }
                    switch result {
                    case .success(let verification):
                        let transaction = try checkVerified(verification)
                        if autoFinish {
                            await transaction.finish()
                            return nil
                        } else {
                            transactions[String(transaction.id)] = transaction
                            sendEvent("purchase-updated", serializeTransaction(transaction))
                            return serializeTransaction(transaction)
                        }
                    case .userCancelled:
                        throw NSError(domain: "ExpoIapModule", code: 3, userInfo: [NSLocalizedDescriptionKey: "User cancelled the purchase"])
                    case .pending:
                        throw NSError(domain: "ExpoIapModule", code: 4, userInfo: [NSLocalizedDescriptionKey: "The payment was deferred"])
                    @unknown default:
                        throw NSError(domain: "ExpoIapModule", code: 5, userInfo: [NSLocalizedDescriptionKey: "Unknown purchase result"])
                    }
                } catch {
                    throw NSError(domain: "ExpoIapModule", code: 6, userInfo: [NSLocalizedDescriptionKey: "Purchase failed: \(error.localizedDescription)"])
                }
            } else {
                throw NSError(domain: "ExpoIapModule", code: 7, userInfo: [NSLocalizedDescriptionKey: "Invalid product ID"])
            }
        }

        AsyncFunction("finishTransaction") { (transactionIdentifier: String) -> Bool in
            if let transaction = transactions[transactionIdentifier] as? Transaction {
                await transaction.finish()
                transactions.removeValue(forKey: transactionIdentifier)
                return true
            } else {
                throw NSError(domain: "ExpoIapModule", code: 8, userInfo: [NSLocalizedDescriptionKey: "Invalid transaction ID"])
            }
        }

        AsyncFunction("getPendingTransactions") { () -> [[String: Any?]?] in
            return transactions.values.compactMap { $0 as? Transaction }.map { serializeTransaction($0) }
        }

        AsyncFunction("sync") { () -> Bool in
            do {
                try await AppStore.sync()
                return true
            } catch {
                throw NSError(domain: "ExpoIapModule", code: 9, userInfo: [NSLocalizedDescriptionKey: "Error synchronizing with the AppStore: \(error.localizedDescription)"])
            }
        }

        AsyncFunction("presentCodeRedemptionSheet") { () -> Bool in
            #if !os(tvOS)
            SKPaymentQueue.default().presentCodeRedemptionSheet()
            return true
            #else
            throw NSError(domain: "ExpoIapModule", code: 10, userInfo: [NSLocalizedDescriptionKey: "This method is not available on tvOS"])
            #endif
        }

        AsyncFunction("showManageSubscriptions") { () -> Bool in
            #if !os(tvOS)
            guard let windowScene = await currentWindowScene() else {
                throw NSError(domain: "ExpoIapModule", code: 11, userInfo: [NSLocalizedDescriptionKey: "Cannot find window scene or not available on macOS"])
            }
            try await AppStore.showManageSubscriptions(in: windowScene)
            return true
            #else
            throw NSError(domain: "ExpoIapModule", code: 12, userInfo: [NSLocalizedDescriptionKey: "This method is not available on tvOS"])
            #endif
        }
    }

    public func startObserving() {
        hasListeners = true
    }

    public func stopObserving() {
        hasListeners = false
    }

    public func supportedEvents() -> [String] {
        return ["purchase-updated", "purchase-error", "iap-transaction-updated"]
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
}
