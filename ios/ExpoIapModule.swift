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

public class ExpoIapModule: Module {
  private var transactions: [String: Any] = [:]
  private let productStore = ProductStore()

  public func definition() -> ModuleDefinition {
    Name("ExpoIap")

    Constants([
      "PI": Double.pi
    ])

    Events("onChange")

    Function("hello") {
      return "Hello world! 👋"
    }

    Function("initConnection") {
      return AppStore.canMakePayments
    }

    AsyncFunction("getItems") { (skus: [String]) -> [[String: Any?]?] in
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
      await productStore.removeAll()
      transactions.removeAll()
      removeTransactionObserver()
      return true
    }
  }

  func addTransactionObserver() {
  }

  func removeTransactionObserver() {
  }
}

