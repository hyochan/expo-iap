import Foundation
import OpenIAP

enum OnsideIapLog {
    static func payload(_ name: String, payload: Any?) {
        debug("\(name) payload: \(String(describing: payload))")
    }

    static func result(_ name: String, value: Any?) {
        debug("\(name) result: \(String(describing: value))")
    }

    static func failure(_ name: String, error: Error) {
        debug("\(name) failed: \(error.localizedDescription)")
    }

    private static func debug(_ message: String) {
        #if DEBUG
        print("[ExpoIapOnside] \(message)")
        #endif
    }
}

enum OnsideIapSupport {
    static func decodeProductRequest(from payload: [String: Any]) throws -> ProductRequest {
        if let skus = payload["skus"] as? [String], !skus.isEmpty {
            return try OpenIapSerialization.productRequest(skus: skus, type: .all)
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
}
