import Foundation
import OpenIAP

enum ExpoIapHelper {
    private static var listeners: [Subscription] = []

    static func sanitizeDictionary(_ dictionary: [String: Any?]) -> [String: Any] {
        var result: [String: Any] = [:]
        for (key, value) in dictionary {
            if let value {
                result[key] = value
            }
        }
        return result
    }

    static func sanitizeArray(_ array: [[String: Any?]]) -> [[String: Any]] {
        array.map { sanitizeDictionary($0) }
    }

    // Overloads to support already-sanitized payloads (e.g., serialized OpenIAP responses)
    static func sanitizeDictionary(_ dictionary: [String: Any]) -> [String: Any] {
        dictionary
    }

    static func sanitizeArray(_ array: [[String: Any]]) -> [[String: Any]] {
        array
    }

    static func parseProductQueryType(_ rawValue: String?) -> ProductQueryType {
        guard let raw = rawValue?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty
        else {
            return .all
        }
        switch raw.lowercased() {
        case "inapp", ProductQueryType.inApp.rawValue:
            return .inApp
        case ProductQueryType.subs.rawValue:
            return .subs
        case ProductQueryType.all.rawValue:
            return .all
        default:
            return .all
        }
    }

    static func decodeProductRequest(from payload: [String: Any]) throws -> ProductRequest {
        if let skus = payload["skus"] as? [String], !skus.isEmpty {
            let type = parseProductQueryType(payload["type"] as? String)
            return try OpenIapSerialization.productRequest(skus: skus, type: type)
        }

        let indexedSkus = payload.keys
            .compactMap { Int($0) }
            .sorted()
            .compactMap { payload[String($0)] as? String }

        if !indexedSkus.isEmpty {
            return try OpenIapSerialization.productRequest(skus: indexedSkus, type: .all)
        }

        if let request = try? OpenIapSerialization.decode(object: payload, as: ProductRequest.self)
        {
            return request
        }

        throw PurchaseError.emptySkuList()
    }

    static func decodeRequestPurchaseProps(from payload: [String: Any]) throws
        -> RequestPurchaseProps
    {
        if payload["requestPurchase"] != nil || payload["requestSubscription"] != nil {
            return try OpenIapSerialization.decode(object: payload, as: RequestPurchaseProps.self)
        }

        if let request = payload["request"] {
            let parsedType = parseProductQueryType(payload["type"] as? String)
            let purchaseType: ProductQueryType = parsedType == .all ? .inApp : parsedType
            var normalized: [String: Any] = ["type": purchaseType.rawValue]
            switch purchaseType {
            case .subs:
                normalized["requestSubscription"] = request
            case .inApp:
                normalized["requestPurchase"] = request
            case .all:
                break
            }
            return try OpenIapSerialization.decode(
                object: normalized, as: RequestPurchaseProps.self)
        }

        if payload["sku"] != nil {
            let normalized: [String: Any] = [
                "type": ProductQueryType.inApp.rawValue,
                "requestPurchase": ["ios": payload],
            ]
            return try OpenIapSerialization.decode(
                object: normalized, as: RequestPurchaseProps.self)
        }

        throw PurchaseError.make(code: .developerError, message: "Invalid request payload")
    }

    static func setupListeners(
        module: ExpoIapModule,
        purchaseUpdated: @escaping (Purchase) -> Void,
        purchaseError: @escaping (PurchaseError) -> Void,
        promotedProduct: @escaping (String) async -> Void
    ) {
        // Clean up any existing listeners first
        cleanupListeners()

        let purchaseUpdatedSub = OpenIapModule.shared.purchaseUpdatedListener { purchase in
            Task { @MainActor in
                purchaseUpdated(purchase)
            }
        }

        let purchaseErrorSub = OpenIapModule.shared.purchaseErrorListener { error in
            Task { @MainActor in
                purchaseError(error)
            }
        }

        let promotedProductSub = OpenIapModule.shared.promotedProductListenerIOS { productId in
            Task { @MainActor in
                await promotedProduct(productId)
            }
        }

        listeners = [purchaseUpdatedSub, purchaseErrorSub, promotedProductSub]
    }

    static func cleanupListeners() {
        // Clear subscriptions to prevent memory leaks
        // Subscription deinit will automatically call onRemove closure
        listeners.removeAll()
    }

    static func setupStore(module: ExpoIapModule) {
        setupListeners(
            module: module,
            purchaseUpdated: { [weak module] purchase in
                guard let module else { return }
                let payload = sanitizeDictionary(OpenIapSerialization.purchase(purchase))
                module.sendEvent(OpenIapEvent.purchaseUpdated.rawValue, payload)
            },
            purchaseError: { [weak module] error in
                guard let module else { return }
                let payload = sanitizeDictionary(OpenIapSerialization.encode(error))
                module.sendEvent(OpenIapEvent.purchaseError.rawValue, payload)
            },
            promotedProduct: { [weak module] productId in
                guard let module else { return }
                do {
                    if let product = try await OpenIapModule.shared.getPromotedProductIOS() {
                        let sanitized = sanitizeDictionary(OpenIapSerialization.encode(product))
                        module.sendEvent(OpenIapEvent.promotedProductIos.rawValue, sanitized)
                        return
                    }
                } catch {
                    ExpoIapLog.failure("promotedProductListenerIOS", error: error)
                }

                module.sendEvent(
                    OpenIapEvent.promotedProductIos.rawValue,
                    ["productId": productId]
                )
            }
        )
    }

    static func cleanupStore() async {
        cleanupListeners()
        _ = try? await OpenIapModule.shared.endConnection()
    }

    static func ensureConnection(isInitialized: Bool) async throws {
        try await MainActor.run {
            guard isInitialized else {
                throw PurchaseError.make(
                    code: .initConnection,
                    message: "Connection not initialized. Call initConnection() first."
                )
            }
        }
    }
}
