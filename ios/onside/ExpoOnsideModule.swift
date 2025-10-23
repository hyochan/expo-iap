import ExpoModulesCore

#if canImport(MarketplaceKit)
import MarketplaceKit
#endif

public class ExpoOnsideModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoOnsideModule")

        AsyncFunction("checkInstallationFromOnsideAsync") { () async -> Bool in
      #if canImport(MarketplaceKit)
      if #available(iOS 17.4, *) {
        do {
          let distributor = try await AppDistributor.current
          if case let .marketplace(marketplaceID) = distributor {
            return marketplaceID == "com.onside.marketplace-app"
          }
        } catch {
          // swallow and fall through to false
        }
      }
      #endif
      return false
    }
  }
}
