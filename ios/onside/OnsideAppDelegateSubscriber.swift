import ExpoModulesCore

#if canImport(OnsideKit)
import OnsideKit

public class OnsideAppDelegateSubscriber: ExpoAppDelegateSubscriber {

    public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
    ) -> Bool {
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



        return true
    }

    public func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
    ) -> Bool {
        #if DEBUG
        print("[OnsideAppDelegate] 📥 Received URL: \(url.absoluteString)")
        print("[OnsideAppDelegate] URL scheme: \(url.scheme ?? "nil")")
        print("[OnsideAppDelegate] sourceApplication: \(options[.sourceApplication] ?? "nil")")
        print("[OnsideAppDelegate] Current thread: \(Thread.current)")
        print("[OnsideAppDelegate] Is main thread: \(Thread.isMainThread)")
        #endif

        // Check if this is an Onside callback URL
        let bundleId = Bundle.main.bundleIdentifier ?? ""
        let expectedScheme = bundleId + ".onside-auth"

        guard let scheme = url.scheme else {
            #if DEBUG
            print("[OnsideAppDelegate] URL has no scheme")
            #endif
            return false
        }

        // Also check for plain "onside" scheme
        if scheme == "onside" {
            #if DEBUG
            print("[OnsideAppDelegate] 🔗 Received onside:// URL (from Onside Store)")
            #endif
            // Still try to handle it
            let handled = Onside.handle(url: url)
            #if DEBUG
            print("[OnsideAppDelegate] Onside.handle returned: \(handled)")
            #endif
            return handled
        }

        // Only handle Onside callback URLs
        if scheme == expectedScheme {
            #if DEBUG
            print("[OnsideAppDelegate] 🔐 Handling Onside callback (auth)")
            #endif

            // Handle synchronously - Onside.handle must be called on the same runloop
            let handled = Onside.handle(url: url)
            #if DEBUG
            print("[OnsideAppDelegate] Onside.handle returned: \(handled)")

            if handled {
                print("[OnsideAppDelegate] ✅ Successfully handled Onside callback")

                // Ensure app returns to active state
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
    }

    public func applicationDidBecomeActive(_ application: UIApplication) {
        #if DEBUG
        print("[OnsideAppDelegate] 🟢 applicationDidBecomeActive")
        #endif
    }

    public func applicationWillResignActive(_ application: UIApplication) {
        #if DEBUG
        print("[OnsideAppDelegate] 🟡 applicationWillResignActive")
        #endif
    }
}
#endif
