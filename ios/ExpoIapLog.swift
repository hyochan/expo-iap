import Foundation
#if canImport(os)
import os
#endif

enum ExpoIapLog {
    enum Level: String {
        case debug
        case info
        case warn
        case error
    }

    private static var isEnabled: Bool = {
        #if DEBUG
        true
        #else
        false
        #endif
    }()

    private static var customHandler: ((Level, String) -> Void)?

    static func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
    }

    static func setHandler(_ handler: ((Level, String) -> Void)?) {
        customHandler = handler
    }

    static func debug(_ message: String) { log(.debug, message) }
    static func info(_ message: String) { log(.info, message) }
    static func warn(_ message: String) { log(.warn, message) }
    static func error(_ message: String) { log(.error, message) }

    private static func log(_ level: Level, _ message: String) {
        guard isEnabled else { return }

        if let handler = customHandler {
            handler(level, message)
            return
        }

        #if canImport(os)
        let logger = Logger(subsystem: "dev.hyo.expo-iap", category: "ExpoIap")
        let formatted = "[ExpoIap] \(message)"
        switch level {
        case .debug:
            logger.debug("\(formatted, privacy: .public)")
        case .info:
            logger.info("\(formatted, privacy: .public)")
        case .warn:
            logger.warning("\(formatted, privacy: .public)")
        case .error:
            logger.error("\(formatted, privacy: .public)")
        }
        #else
        NSLog("[ExpoIap][%@] %@", level.rawValue.uppercased(), message)
        #endif
    }
}
