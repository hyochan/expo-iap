import ExpoModulesCore
#if canImport(OnsideKit)
import OnsideKit
#endif

public class OnsideAppDelegateSubscriber: ExpoAppDelegateSubscriber {

    public func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        #if canImport(OnsideKit)
        #if DEBUG
        print("[OnsideAppDelegate] 🚀 didFinishLaunching")
        #endif
        Onside.initialize()
        #if DEBUG
        print("[OnsideAppDelegate] ✅ Onside initialized")
        #endif
        let bundleId = Bundle.main.bundleIdentifier ?? ""
        let callbackScheme = bundleId + ".onside-auth"
        Onside.callbackScheme = callbackScheme

        #if DEBUG
        print("[OnsideAppDelegate] Callback scheme: \(callbackScheme)")
        #endif
        #endif
        return true
    }

    public func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        #if canImport(OnsideKit)
        #if DEBUG
        print("[OnsideAppDelegate] 📥 Received URL: \(url.absoluteString)")
        print("[OnsideAppDelegate] URL scheme: \(url.scheme ?? "nil")")
        print("[OnsideAppDelegate] sourceApplication: \(options[.sourceApplication] ?? "nil")")
        print("[OnsideAppDelegate] Current thread: \(Thread.current)")
        print("[OnsideAppDelegate] Is main thread: \(Thread.isMainThread)")
        #endif

        let bundleId = Bundle.main.bundleIdentifier ?? ""
        let expectedScheme = bundleId + ".onside-auth"

        guard let scheme = url.scheme else {
            #if DEBUG
            print("[OnsideAppDelegate] URL has no scheme")
            #endif
            return false
        }

        if scheme == "onside" {
            #if DEBUG
            print("[OnsideAppDelegate] 🔗 Received onside:// URL (from Onside Store)")
            #endif
            let handled = Onside.handle(url: url)
            #if DEBUG
            print("[OnsideAppDelegate] Onside.handle returned: \(handled)")
            #endif
            return handled
        }

        if scheme == expectedScheme {
            #if DEBUG
            print("[OnsideAppDelegate] 🔐 Handling Onside callback (auth)")
            #endif
            let handled = Onside.handle(url: url)
            #if DEBUG
            print("[OnsideAppDelegate] Onside.handle returned: \(handled)")
            if handled {
                print("[OnsideAppDelegate] ✅ Successfully handled Onside callback")
                DispatchQueue.main.async {
                    print("[OnsideAppDelegate] 🔄 Ensuring app is active...")
                }
            } else {
                print("[OnsideAppDelegate] ⚠️ Onside.handle returned false")
            }
            #endif
            return handled
        }

        #if DEBUG
        print("[OnsideAppDelegate] ℹ️ Not an Onside callback URL (expected: \(expectedScheme)), passing through")
        #endif
        return false
        #else
        return false
        #endif
    }

    public func applicationDidBecomeActive(_ application: UIApplication) {
        #if canImport(OnsideKit)
        #if DEBUG
        print("[OnsideAppDelegate] 🟢 applicationDidBecomeActive")
        #endif
        #endif
    }

    public func applicationWillResignActive(_ application: UIApplication) {
        #if canImport(OnsideKit)
        #if DEBUG
        print("[OnsideAppDelegate] 🟡 applicationWillResignActive")
        #endif
        #endif
    }
}
