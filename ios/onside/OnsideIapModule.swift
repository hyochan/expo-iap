import ExpoModulesCore
import Foundation
import OpenIAP

private enum OnsideEvent: String {
    case purchaseUpdated = "purchase-updated"
    case purchaseError = "purchase-error"
    case promotedProductIOS = "promoted-product-ios"
}

private enum OnsideBridgeError: Error, LocalizedError {
    case sdkUnavailable
    case notInitialized
    case emptySkuList
    case productNotFound(String)
    case transactionNotFound(String)
    case restoreInProgress
    case queueError(String)

    var errorDescription: String? {
        switch self {
        case .sdkUnavailable:
            return "OnsideKit is not installed. Enable ios.onside.enabled to use this functionality."
        case .notInitialized:
            return "Connection not initialized. Call initConnection() first."
        case .emptySkuList:
            return "No product identifiers provided."
        case .productNotFound(let sku):
            return "Product with identifier \(sku) was not fetched. Call fetchProducts() first."
        case .transactionNotFound(let id):
            return "Could not locate transaction with id \(id)."
        case .restoreInProgress:
            return "A restore operation is already in progress."
        case .queueError(let message):
            return message
        }
    }
}

#if canImport(OnsideKit)
import OnsideKit

@available(iOS 16.0, *)
@MainActor
public final class OnsideIapModule: Module {
private var isInitialized = false
private var restoreContinuation: CheckedContinuation<Bool, Error>?
private let transactionObserver = OnsideTransactionObserverBridge()
private let productFetcher = OnsideProductFetcher()
private var productCache: [String: OnsideProduct] = [:]
private var transactionCache: [UUID: OnsidePaymentTransaction] = [:]

private let encoder: JSONEncoder = {
let encoder = JSONEncoder()
encoder.dateEncodingStrategy = .millisecondsSince1970
return encoder
}()

nonisolated public func definition() -> ModuleDefinition {
Name("ExpoIapOnside")

Constants {
var constants: [String: Any] = [:]
OpenIapSerialization.errorCodes().forEach { key, value in
constants[key] = value
}
constants["IS_ONSIDE_KIT_INSTALLED_IOS"] = true
return constants
}

Events(
OnsideEvent.purchaseUpdated.rawValue,
OnsideEvent.purchaseError.rawValue,
OnsideEvent.promotedProductIOS.rawValue
)

OnCreate {
Task { @MainActor in
self.configureObserverCallbacks()
}
}

OnDestroy {
Task { @MainActor in
self.cleanup()
}
}

AsyncFunction("initConnection") { () async throws -> Bool in
ExpoIapLog.payload("initConnectionOnside", payload: nil)
try await ensureObserverRegistered()
return true
}

AsyncFunction("endConnection") { () async throws -> Bool in
ExpoIapLog.payload("endConnectionOnside", payload: nil)
await cleanup()
return true
}

AsyncFunction("fetchProducts") { (params: [String: Any]) async throws -> [[String: Any]] in
ExpoIapLog.payload("fetchProductsOnside", payload: params)
try await ensureObserverRegistered()

let request = try ExpoIapHelper.decodeProductRequest(from: params)
guard !request.skus.isEmpty else {
throw OnsideBridgeError.emptySkuList
}

let response = try await productFetcher.fetch(identifiers: Set(request.skus))

if !response.invalidProductIdentifiers.isEmpty {
throw OnsideBridgeError.productNotFound(response.invalidProductIdentifiers.joined(separator: ", "))
}

await MainActor.run {
response.products.forEach { productCache[$0.productIdentifier] = $0 }
}

let payload: [[String: Any]] = try await MainActor.run {
for p in response.products {
productCache[p.productIdentifier] = p
}
return try response.products.map { try serializeProduct($0) }
}
ExpoIapLog.result("fetchProductsOnside", value: payload)
return payload
}

AsyncFunction("requestPurchase") { (payload: [String: Any]) async throws -> Any? in
ExpoIapLog.payload("requestPurchaseOnside", payload: payload)
try await ensureObserverRegistered()

let sku: String = try await MainActor.run {
guard let s = resolveSku(from: payload) else {
throw OnsideBridgeError.emptySkuList
}
return s
}

try await ensureProductAvailable(sku: sku)

let product: OnsideProduct = try await MainActor.run {
guard let p = productCache[sku] else {
throw OnsideBridgeError.productNotFound(sku)
}

return product
}

try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
Task { @MainActor in
Onside.paymentQueue().add(product) { result in
switch result {
case .success:
continuation.resume()
case .failure(let error):
continuation.resume(throwing: OnsideBridgeError.queueError(error.localizedDescription))
}
}
}
}

ExpoIapLog.result("requestPurchaseOnside", value: nil as Any?)
return nil
}

AsyncFunction("finishTransaction") { (purchasePayload: [String: Any], _: Bool?) async throws -> Bool in
ExpoIapLog.payload("finishTransactionOnside", payload: purchasePayload)
try await ensureObserverRegistered()

guard
let transactionId = purchasePayload["transactionId"] as? String,
let uuid = UUID(uuidString: transactionId)
else {
throw OnsideBridgeError.transactionNotFound(purchasePayload["transactionId"] as? String ?? "")
}


let transaction = await MainActor.run { transactionCache[uuid] }
guard let transaction else {
throw OnsideBridgeError.transactionNotFound(transactionId)
}


await Onside.paymentQueue().finishTransaction(transaction)


await MainActor.run { transactionCache.removeValue(forKey: uuid) }

ExpoIapLog.result("finishTransactionOnside", value: true)
return true
}


AsyncFunction("restorePurchases") { () async throws -> Bool in
ExpoIapLog.payload("restorePurchasesOnside", payload: nil)
try await ensureObserverRegistered()


try await MainActor.run {
if self.restoreContinuation != nil {
throw OnsideBridgeError.restoreInProgress
}
}

return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Bool, Error>) in

Task { @MainActor [weak self] in
self?.restoreContinuation = continuation

Onside.paymentQueue().restoreCompletedTransactions { result in
switch result {
case .success:
continuation.resume(returning: true)
case .failure(let error):
continuation.resume(
throwing: OnsideBridgeError.queueError(error.localizedDescription)
)
}


Task { @MainActor [weak self] in
self?.restoreContinuation = nil
}
}
}
}
}



AsyncFunction("getStorefrontIOS") { () async throws -> String in
ExpoIapLog.payload("getStorefrontOnside", payload: nil)
try await ensureObserverRegistered()
let storefront = await Onside.paymentQueue().storefront?.countryCode ?? ""
ExpoIapLog.result("getStorefrontOnside", value: storefront)
return storefront
}
}

private func ensureObserverRegistered() async throws {
if !isInitialized {
Onside.paymentQueue().add(observer: transactionObserver)
isInitialized = true
}
}

private func ensureProductAvailable(sku: String) async throws {
if productCache[sku] != nil {
return
}
let response = try await productFetcher.fetch(identifiers: [sku])
if !response.invalidProductIdentifiers.isEmpty {
throw OnsideBridgeError.productNotFound(sku)
}
response.products.forEach { productCache[$0.productIdentifier] = $0 }
}


private func configureObserverCallbacks() {
transactionObserver.onTransactionsUpdated = { [weak self] transactions in
guard let self = self else { return }
transactions.forEach { transaction in
self.transactionCache[transaction.id] = transaction
self.handle(transaction: transaction)
}
}

transactionObserver.onRestoreFinished = { [weak self] in
guard let self = self else { return }
self.restoreContinuation?.resume(returning: true)
self.restoreContinuation = nil
}

transactionObserver.onRestoreFailed = { [weak self] error in
guard let self = self else { return }
self.restoreContinuation?.resume(
throwing: OnsideBridgeError.queueError(error.localizedDescription)
)
self.restoreContinuation = nil
}
}


private func cleanup() {
if isInitialized {
Onside.paymentQueue().remove(observer: transactionObserver)
isInitialized = false
}
transactionCache.removeAll()
restoreContinuation?.resume(returning: false)
restoreContinuation = nil
}

private func handle(transaction: OnsidePaymentTransaction) {
do {
let payload = try serialize(transaction: transaction)
switch transaction.transactionState {
case .purchased, .restored:
sendEvent(OnsideEvent.purchaseUpdated.rawValue, payload)
case .failed:
let errorPayload: [String: Any] = [
"code": ErrorCode.purchaseError.rawValue,
"message": (transaction.error?.localizedDescription ?? "Purchase failed"),
"productId": transaction.product.productIdentifier
]
sendEvent(OnsideEvent.purchaseError.rawValue, errorPayload)
case .purchasing:
break
@unknown default:
break
}
} catch {
ExpoIapLog.failure("handleTransactionOnside", error: error)
}
}

private func serializeProduct(_ product: OnsideProduct) throws -> [String: Any] {
var dictionary: [String: Any?] = [:]
dictionary["id"] = product.productIdentifier
dictionary["platform"] = "ios"
dictionary["title"] = product.localizedTitle
dictionary["description"] = product.localizedDescription
dictionary["displayName"] = product.localizedTitle
dictionary["displayNameIOS"] = product.localizedTitle
dictionary["displayPrice"] = product.price.formatted
dictionary["currency"] = product.price.currencyCode
dictionary["price"] = product.price.value
dictionary["type"] = "in-app"
dictionary["typeIOS"] = "non-consumable"
dictionary["isFamilyShareableIOS"] = false
dictionary["jsonRepresentationIOS"] = try encodeToJSONString(product)
dictionary["debugDescription"] = product.description
return sanitize(dictionary)
}

private func serialize(transaction: OnsidePaymentTransaction) throws -> [String: Any] {
let product = transaction.product
var dictionary: [String: Any?] = [:]
dictionary["id"] = transaction.id.uuidString
dictionary["transactionId"] = transaction.id.uuidString
dictionary["productId"] = product.productIdentifier
dictionary["platform"] = "ios"
dictionary["quantity"] = 1
dictionary["isAutoRenewing"] = false
dictionary["purchaseState"] = mapPurchaseState(transaction.transactionState)
dictionary["transactionDate"] = Int(Date().timeIntervalSince1970 * 1000)
dictionary["currencyCodeIOS"] = product.price.currencyCode
dictionary["currencySymbolIOS"] = product.price.formatted
dictionary["storefrontCountryCodeIOS"] = transaction.storefront.countryCode
dictionary["purchaseToken"] = nil
dictionary["environmentIOS"] = transaction.storefront.id
if let error = transaction.error {
dictionary["reasonIOS"] = error.localizedDescription
}
return sanitize(dictionary)
}

private func encodeToJSONString<T: Encodable>(_ value: T) throws -> String {
let data = try encoder.encode(value)
guard let json = String(data: data, encoding: .utf8) else {
throw OnsideBridgeError.queueError("Unable to encode JSON string")
}
return json
}

private func sanitize(_ dictionary: [String: Any?]) -> [String: Any] {
var result: [String: Any] = [:]
for (key, value) in dictionary {
if let value {
result[key] = value
}
}
return result
}

private func mapPurchaseState(_ state: OnsidePaymentTransactionState) -> String {
switch state {
case .purchased:
return "purchased"
case .restored:
return "restored"
case .failed:
return "failed"
case .purchasing:
return "pending"
@unknown default:
return "unknown"
}
}

private func resolveSku(from payload: [String: Any]) -> String? {
if let sku = payload["sku"] as? String, !sku.isEmpty {
return sku
}

if let request = payload["request"] as? [String: Any] {
if let ios = request["ios"] as? [String: Any] {
if let sku = ios["sku"] as? String, !sku.isEmpty {
return sku
}
if let skus = ios["skus"] as? [String], let first = skus.first, !first.isEmpty {
return first
}
}
}

if let requestPurchase = payload["requestPurchase"] as? [String: Any],
let ios = requestPurchase["ios"] as? [String: Any],
let sku = ios["sku"] as? String, !sku.isEmpty {
return sku
}

if let requestSubscription = payload["requestSubscription"] as? [String: Any],
let ios = requestSubscription["ios"] as? [String: Any],
let sku = ios["sku"] as? String, !sku.isEmpty {
return sku
}

if let skus = payload["skus"] as? [String], let first = skus.first, !first.isEmpty {
return first
}

return nil
}
}

@available(iOS 16.0, *)
private final class OnsideTransactionObserverBridge: NSObject, OnsidePaymentTransactionObserver {
var onTransactionsUpdated: (([OnsidePaymentTransaction]) -> Void)?
var onRestoreFinished: (() -> Void)?
var onRestoreFailed: ((OnsideTransactionsRestoreError) -> Void)?

func onsidePaymentQueue(_ queue: OnsidePaymentQueue, updatedTransactions transactions: [OnsidePaymentTransaction]) {
onTransactionsUpdated?(transactions)
}

func onsidePaymentQueue(_ queue: OnsidePaymentQueue, removedTransactions: [OnsidePaymentTransaction]) {}

func onsidePaymentQueueRestoreCompletedTransactionsFinished(_ queue: OnsidePaymentQueue) {
onRestoreFinished?()
}

func onsidePaymentQueue(_ queue: OnsidePaymentQueue, restoreCompletedTransactionsFailedWithError error: OnsideTransactionsRestoreError) {
onRestoreFailed?(error)
}

func onsidePaymentQueueDidChangeStorefront(_ queue: OnsidePaymentQueue) {}
}

@available(iOS 16.0, *)
private final class OnsideProductFetcher: NSObject, OnsideProductsRequestDelegate {
private var continuation: CheckedContinuation<OnsideProductsResponse, Error>?
private var request: OnsideProductsRequest?

@MainActor
func fetch(identifiers: Set<String>) async throws -> OnsideProductsResponse {
guard !identifiers.isEmpty else {
throw OnsideBridgeError.emptySkuList
}

return try await withCheckedThrowingContinuation { continuation in
let request = Onside.makeProductsRequest(productIdentifiers: identifiers)
self.request = request
self.continuation = continuation
request.delegate = self
request.start()
}
}

func onsideProductsRequest(_ request: OnsideProductsRequest, didReceive response: OnsideProductsResponse) {
continuation?.resume(returning: response)
cleanup()
}

func onsideProductsRequestRequest(_ request: OnsideProductsRequest, didFailWithError error: OnsideProductsRequestError) {
continuation?.resume(throwing: OnsideBridgeError.queueError(error.localizedDescription))
cleanup()
}

func onsideProductsRequestDidFinish(_ request: OnsideProductsRequest) {
cleanup()
}

@MainActor
private func cleanup() {
request?.delegate = nil
request?.stop()
request = nil
continuation = nil
}
}

#else

@available(iOS 15.0, tvOS 15.0, *)
@MainActor
public final class OnsideIapModule: Module {
nonisolated public func definition() -> ModuleDefinition {
Name("ExpoIapOnside")

Constants {
var constants: [String: Any] = [:]
OpenIapSerialization.errorCodes().forEach { key, value in
constants[key] = value
}
constants["IS_ONSIDE_KIT_INSTALLED_IOS"] = false
return constants
}

Events(
OnsideEvent.purchaseUpdated.rawValue,
OnsideEvent.purchaseError.rawValue,
OnsideEvent.promotedProductIOS.rawValue
)

AsyncFunction("initConnection") { () async throws -> Bool in
throw OnsideBridgeError.sdkUnavailable
}

AsyncFunction("endConnection") { () async throws -> Bool in
throw OnsideBridgeError.sdkUnavailable
}

AsyncFunction("fetchProducts") { (_: [String: Any]) async throws -> [[String: Any]] in
throw OnsideBridgeError.sdkUnavailable
}

AsyncFunction("requestPurchase") { (_: [String: Any]) async throws -> Any? in
throw OnsideBridgeError.sdkUnavailable
}

AsyncFunction("finishTransaction") { (_: [String: Any], _: Bool?) async throws -> Bool in
throw OnsideBridgeError.sdkUnavailable
}

AsyncFunction("restorePurchases") { () async throws -> Bool in
throw OnsideBridgeError.sdkUnavailable
}

AsyncFunction("getStorefrontIOS") { () async throws -> String in
throw OnsideBridgeError.sdkUnavailable
}
}
}

#endif
