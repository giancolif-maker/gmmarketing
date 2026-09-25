#if canImport(AppKit)
import AppKit

/// Puts a window on the macOS lock screen.
///
/// Normal windows are hidden while the screen is locked. The private SkyLight
/// framework lets us create a window-server "space" at an absolute level above
/// the lock screen and move our window into it. This is private API: it may
/// break in a future macOS release, which is why every symbol is resolved at
/// runtime and failure just means "desktop only".
enum SkyLight {
    private typealias MainConnectionID = @convention(c) () -> Int32
    private typealias SpaceCreate = @convention(c) (Int32, Int32, Int32) -> UInt64
    private typealias SpaceSetAbsoluteLevel = @convention(c) (Int32, UInt64, Int32) -> Int32
    private typealias ShowSpaces = @convention(c) (Int32, CFArray) -> Int32
    private typealias SpaceAddWindowsAndRemoveFromSpaces = @convention(c) (Int32, UInt64, CFArray, Int32) -> Int32

    /// Absolute space level of the lock screen's notification layer.
    private static let lockScreenLevel: Int32 = 400

    private static let handle = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight", RTLD_NOW)
    private static var space: UInt64 = 0

    private static func load<T>(_ name: String, as type: T.Type) -> T? {
        guard let handle, let symbol = dlsym(handle, name) else { return nil }
        return unsafeBitCast(symbol, to: type)
    }

    /// Returns false if the private API isn't available.
    @MainActor
    static func moveToLockScreen(_ window: NSWindow) -> Bool {
        guard
            let mainConnectionID = load("SLSMainConnectionID", as: MainConnectionID.self),
            let spaceCreate = load("SLSSpaceCreate", as: SpaceCreate.self),
            let setLevel = load("SLSSpaceSetAbsoluteLevel", as: SpaceSetAbsoluteLevel.self),
            let showSpaces = load("SLSShowSpaces", as: ShowSpaces.self),
            let addWindows = load("SLSSpaceAddWindowsAndRemoveFromSpaces", as: SpaceAddWindowsAndRemoveFromSpaces.self),
            window.windowNumber > 0
        else { return false }

        let connection = mainConnectionID()
        if space == 0 {
            space = spaceCreate(connection, 1, 0)
            guard space != 0 else { return false }
            _ = setLevel(connection, space, lockScreenLevel)
            _ = showSpaces(connection, [NSNumber(value: space)] as CFArray)
        }
        return addWindows(connection, space, [NSNumber(value: window.windowNumber)] as CFArray, 7) == 0
    }
}
#endif
