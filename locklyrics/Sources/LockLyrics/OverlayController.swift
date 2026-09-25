#if canImport(AppKit)
import AppKit
import Combine
import IOKit.pwr_mgt
import SwiftUI

/// A transparent, click-through, full-screen panel that hosts the lyrics.
final class OverlayWindow: NSPanel {
    convenience init(frame: NSRect) {
        self.init(contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        ignoresMouseEvents = true
        isReleasedWhenClosed = false
        hidesOnDeactivate = false
        level = .screenSaver
        collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

/// Decides when the overlay is visible and keeps the display awake while it is.
@MainActor
final class OverlayController {
    private let state: AppState
    private let settings: Settings
    private let window: OverlayWindow
    private var cancellables: Set<AnyCancellable> = []
    private var displayAssertion: IOPMAssertionID = 0
    private var isShown = false

    /// False if the lock-screen private API is unavailable on this macOS version.
    private(set) var lockScreenSupported = false

    init(state: AppState, settings: Settings) {
        self.state = state
        self.settings = settings
        window = OverlayWindow(frame: NSScreen.main?.frame ?? .zero)
        window.contentView = NSHostingView(rootView: LyricsOverlayView(state: state, settings: settings))

        // The window stays ordered in and is shown/hidden with alpha, so it
        // never leaves the lock-screen space it was moved into.
        window.alphaValue = 0
        window.orderFrontRegardless()
        lockScreenSupported = SkyLight.moveToLockScreen(window)

        Publishers.Merge(state.objectWillChange, settings.objectWillChange)
            .receive(on: DispatchQueue.main)  // objectWillChange fires before the new value is set
            .sink { [weak self] in self?.update() }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: NSApplication.didChangeScreenParametersNotification)
            .sink { [weak self] _ in self?.fitToScreen() }
            .store(in: &cancellables)
    }

    private func fitToScreen() {
        if let frame = NSScreen.main?.frame { window.setFrame(frame, display: true) }
    }

    private func update() {
        let hasSomethingToShow = state.lyrics != nil && state.isPlaying
        let placeAllowed = settings.displayMode == .always || state.isLocked
        let shouldShow = state.isPreviewing || (hasSomethingToShow && placeAllowed)

        if shouldShow != isShown {
            isShown = shouldShow
            if shouldShow { fitToScreen() }
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.4
                window.animator().alphaValue = shouldShow ? 1 : 0
            }
        }

        setDisplayAwake(shouldShow && state.isLocked && state.isPlaying && settings.keepDisplayAwake)
    }

    /// Stops the lock screen from dimming/sleeping the display while lyrics play.
    private func setDisplayAwake(_ awake: Bool) {
        if awake, displayAssertion == 0 {
            IOPMAssertionCreateWithName(
                kIOPMAssertionTypePreventUserIdleDisplaySleep as CFString,
                IOPMAssertionLevel(kIOPMAssertionLevelOn),
                "LockLyrics is showing lyrics" as CFString,
                &displayAssertion
            )
        } else if !awake, displayAssertion != 0 {
            IOPMAssertionRelease(displayAssertion)
            displayAssertion = 0
        }
    }
}
#endif
