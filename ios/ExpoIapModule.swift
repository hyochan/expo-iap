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
  private var productStore: ProductStore?

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
      removeTransactionObserver()
      return true
    }
  }

  func addTransactionObserver() {
  }

  func removeTransactionObserver() {
  }
}

