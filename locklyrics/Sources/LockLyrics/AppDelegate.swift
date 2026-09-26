#if canImport(AppKit)
import AppKit
import SwiftUI

@main
enum LockLyricsMain {
    // NSApplication.delegate is weak; keep the delegate alive here.
    @MainActor private static var delegate: AppDelegate?

    @MainActor
    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        self.delegate = delegate
        app.delegate = delegate
        app.setActivationPolicy(.accessory)  // menu bar only, no Dock icon
        app.run()
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private let settings = Settings.shared
    private let state = AppState()
    private var overlay: OverlayController?
    private var statusItem: NSStatusItem?
    private var settingsWindow: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.image = NSImage(systemSymbolName: "music.note.list", accessibilityDescription: "LockLyrics")
        let menu = NSMenu()
        menu.delegate = self
        item.menu = menu
        statusItem = item

        overlay = OverlayController(state: state, settings: settings)
        state.start()
    }

    // MARK: - Menu

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()

        menu.addItem(disabled(nowPlayingTitle))
        if let status = lyricsStatusTitle { menu.addItem(disabled(status)) }
        if let app = state.permissionProblem {
            menu.addItem(action("Allow access to \(app.rawValue)…", #selector(openAutomationSettings)))
        }
        if overlay?.lockScreenSupported == false {
            menu.addItem(disabled("Lock screen display unavailable on this macOS"))
        }
        menu.addItem(.separator())

        let styleMenu = NSMenu()
        for style in LyricStyle.allCases {
            let item = action(style.title, #selector(chooseStyle(_:)))
            item.representedObject = style.rawValue
            item.state = settings.style == style ? .on : .off
            styleMenu.addItem(item)
        }
        menu.addItem(submenu("Style", styleMenu))

        let showMenu = NSMenu()
        for mode in DisplayMode.allCases {
            let item = action(mode.title, #selector(chooseDisplayMode(_:)))
            item.representedObject = mode.rawValue
            item.state = settings.displayMode == mode ? .on : .off
            showMenu.addItem(item)
        }
        menu.addItem(submenu("Show", showMenu))

        let emoji = action("Show Emoji", #selector(toggleEmoji))
        emoji.state = settings.showEmoji ? .on : .off
        menu.addItem(emoji)

        let colorMenu = NSMenu()
        for colorway in Colorway.all {
            let item = action(colorway.name, #selector(chooseColorway(_:)))
            item.representedObject = colorway.name
            item.state = !settings.autoColors && settings.colorway == colorway ? .on : .off
            item.image = swatch(colorway)
            colorMenu.addItem(item)
        }
        colorMenu.addItem(.separator())
        let autoColors = action("Auto Sync from Album Art", #selector(toggleAutoColors))
        autoColors.state = settings.autoColors ? .on : .off
        colorMenu.addItem(autoColors)
        colorMenu.addItem(action("Custom Colors…", #selector(openSettings)))
        menu.addItem(submenu("Colors", colorMenu))

        menu.addItem(.separator())
        menu.addItem(action("Hide Lyrics (Esc)", #selector(hideLyrics)))
        menu.addItem(action("Preview on Desktop", #selector(preview)))
        menu.addItem(action("Settings…", #selector(openSettings), key: ","))
        menu.addItem(.separator())
        menu.addItem(action("Quit LockLyrics", #selector(quit), key: "q"))
    }

    private var nowPlayingTitle: String {
        guard let track = state.track else { return "Nothing playing" }
        let icon = state.isPlaying ? "▶︎" : "❚❚"
        return "\(icon) \(track.title) — \(track.artist)"
    }

    private var lyricsStatusTitle: String? {
        guard state.track != nil else { return nil }
        switch state.lyricsStatus {
        case .idle: return nil
        case .loading: return "Looking up lyrics…"
        case .notFound: return "No synced lyrics found"
        case .found:
            return state.lyrics?.isWordSynced == true ? "Word-synced lyrics" : "Line-synced lyrics (word timing estimated)"
        }
    }

    private func action(_ title: String, _ selector: Selector, key: String = "") -> NSMenuItem {
        let item = NSMenuItem(title: title, action: selector, keyEquivalent: key)
        item.target = self
        return item
    }

    private func disabled(_ title: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.isEnabled = false
        return item
    }

    private func submenu(_ title: String, _ submenu: NSMenu) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.submenu = submenu
        return item
    }

    // MARK: - Actions

    @objc private func chooseStyle(_ sender: NSMenuItem) {
        if let raw = sender.representedObject as? String, let style = LyricStyle(rawValue: raw) {
            settings.style = style
        }
    }

    @objc private func chooseDisplayMode(_ sender: NSMenuItem) {
        if let raw = sender.representedObject as? String, let mode = DisplayMode(rawValue: raw) {
            settings.displayMode = mode
        }
    }

    @objc private func toggleEmoji() {
        settings.showEmoji.toggle()
    }

    @objc private func chooseColorway(_ sender: NSMenuItem) {
        if let name = sender.representedObject as? String,
           let colorway = Colorway.all.first(where: { $0.name == name }) {
            settings.apply(colorway)
        }
    }

    /// A little preview of a colorway: background with lyric and highlight dots.
    private func swatch(_ colorway: Colorway) -> NSImage {
        NSImage(size: NSSize(width: 28, height: 14), flipped: false) { rect in
            (NSColor(hex: colorway.background) ?? .black).setFill()
            NSBezierPath(roundedRect: rect, xRadius: 3, yRadius: 3).fill()
            NSColor(white: 0.5, alpha: 0.6).setStroke()
            NSBezierPath(roundedRect: rect.insetBy(dx: 0.5, dy: 0.5), xRadius: 3, yRadius: 3).stroke()
            (NSColor(hex: colorway.lyric) ?? .white).setFill()
            NSBezierPath(ovalIn: NSRect(x: 4, y: 3, width: 8, height: 8)).fill()
            (NSColor(hex: colorway.highlight) ?? .white).setFill()
            NSBezierPath(ovalIn: NSRect(x: 16, y: 3, width: 8, height: 8)).fill()
            return true
        }
    }

    @objc private func toggleAutoColors() {
        settings.autoColors.toggle()
    }

    @objc private func hideLyrics() {
        state.dismiss()
    }

    @objc private func preview() {
        state.preview()
    }

    @objc private func openSettings() {
        if settingsWindow == nil {
            let view = SettingsView(settings: settings) { [weak self] in self?.state.preview() }
            let window = NSWindow(contentViewController: NSHostingController(rootView: view))
            window.title = "LockLyrics Settings"
            window.styleMask = [.titled, .closable]
            window.isReleasedWhenClosed = false
            settingsWindow = window
        }
        NSApp.activate(ignoringOtherApps: true)
        settingsWindow?.center()
        settingsWindow?.makeKeyAndOrderFront(nil)
    }

    @objc private func openAutomationSettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation") {
            NSWorkspace.shared.open(url)
        }
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}
#endif
