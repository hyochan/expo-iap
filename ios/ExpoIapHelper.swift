import Foundation
import OpenIAP

enum ExpoIapHelper {
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
        guard let raw = rawValue?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
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

        if let request = try? OpenIapSerialization.decode(object: payload, as: ProductRequest.self) {
            return request
        }

        throw PurchaseError.emptySkuList()
    }

    static func decodeRequestPurchaseProps(from payload: [String: Any]) throws -> RequestPurchaseProps {
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
            return try OpenIapSerialization.decode(object: normalized, as: RequestPurchaseProps.self)
        }

        if payload["sku"] != nil {
            let normalized: [String: Any] = [
                "type": ProductQueryType.inApp.rawValue,
                "requestPurchase": ["ios": payload]
            ]
            return try OpenIapSerialization.decode(object: normalized, as: RequestPurchaseProps.self)
        }

        throw PurchaseError.make(code: .developerError, message: "Invalid request payload")
    }
}
