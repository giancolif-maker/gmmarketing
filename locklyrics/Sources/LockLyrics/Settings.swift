#if canImport(AppKit)
import AppKit
import SwiftUI

enum LyricStyle: String, CaseIterable, Identifiable {
    case words, visual, stack, drift, lens
    var id: String { rawValue }
    var title: String {
        switch self {
        case .words: "Words (big, one at a time)"
        case .visual: "Words + emoji"
        case .stack: "Lines"
        case .drift: "Drift (3D wall)"
        case .lens: "Lens"
        }
    }
}

enum DisplayMode: String, CaseIterable, Identifiable {
    case lockScreenOnly, always
    var id: String { rawValue }
    var title: String {
        switch self {
        case .lockScreenOnly: "Lock screen only"
        case .always: "Always (desktop too)"
        }
    }
}

struct Palette: Equatable {
    var lyric: NSColor
    var highlight: NSColor
    var secondary: NSColor
}

/// User preferences, persisted to UserDefaults.
@MainActor
final class Settings: ObservableObject {
    static let shared = Settings()
    private let defaults = UserDefaults.standard

    @Published var style: LyricStyle { didSet { defaults.set(style.rawValue, forKey: "style") } }
    @Published var displayMode: DisplayMode { didSet { defaults.set(displayMode.rawValue, forKey: "displayMode") } }
    @Published var autoColors: Bool { didSet { defaults.set(autoColors, forKey: "autoColors") } }
    @Published var lyricHex: String { didSet { defaults.set(lyricHex, forKey: "lyricHex") } }
    @Published var highlightHex: String { didSet { defaults.set(highlightHex, forKey: "highlightHex") } }
    @Published var secondaryHex: String { didSet { defaults.set(secondaryHex, forKey: "secondaryHex") } }
    /// Multiplier on the screen-relative text size.
    @Published var textScale: Double { didSet { defaults.set(textScale, forKey: "textScale") } }
    /// 0 = top of screen, 1 = bottom.
    @Published var verticalPosition: Double { didSet { defaults.set(verticalPosition, forKey: "verticalPosition") } }
    /// Seconds added to the player position (positive = lyrics earlier).
    @Published var offset: Double { didSet { defaults.set(offset, forKey: "offset") } }
    @Published var keepDisplayAwake: Bool { didSet { defaults.set(keepDisplayAwake, forKey: "keepDisplayAwake") } }

    private init() {
        style = LyricStyle(rawValue: defaults.string(forKey: "style") ?? "") ?? .words
        displayMode = DisplayMode(rawValue: defaults.string(forKey: "displayMode") ?? "") ?? .lockScreenOnly
        autoColors = defaults.object(forKey: "autoColors") as? Bool ?? true
        lyricHex = defaults.string(forKey: "lyricHex") ?? "#FFFFFF"
        highlightHex = defaults.string(forKey: "highlightHex") ?? "#FF4F79"
        secondaryHex = defaults.string(forKey: "secondaryHex") ?? "#B8B8C0"
        textScale = defaults.object(forKey: "textScale") as? Double ?? 1
        verticalPosition = defaults.object(forKey: "verticalPosition") as? Double ?? 0.56
        offset = defaults.object(forKey: "offset") as? Double ?? 0.2
        keepDisplayAwake = defaults.object(forKey: "keepDisplayAwake") as? Bool ?? true
    }

    var manualPalette: Palette {
        Palette(
            lyric: NSColor(hex: lyricHex) ?? .white,
            highlight: NSColor(hex: highlightHex) ?? .systemYellow,
            secondary: NSColor(hex: secondaryHex) ?? .lightGray
        )
    }
}

extension NSColor {
    convenience init?(hex: String) {
        var text = hex.trimmingCharacters(in: .whitespaces)
        if text.hasPrefix("#") { text.removeFirst() }
        guard text.count == 6, let value = UInt32(text, radix: 16) else { return nil }
        self.init(
            srgbRed: CGFloat((value >> 16) & 0xFF) / 255,
            green: CGFloat((value >> 8) & 0xFF) / 255,
            blue: CGFloat(value & 0xFF) / 255,
            alpha: 1
        )
    }

    var hexString: String {
        let c = usingColorSpace(.sRGB) ?? self
        let r = Int((c.redComponent * 255).rounded())
        let g = Int((c.greenComponent * 255).rounded())
        let b = Int((c.blueComponent * 255).rounded())
        return String(format: "#%02X%02X%02X", r, g, b)
    }

    /// Linear blend in sRGB; `fraction` 0 = self, 1 = other.
    func mixed(with other: NSColor, _ fraction: Double) -> NSColor {
        blended(withFraction: CGFloat(min(max(fraction, 0), 1)), of: other) ?? self
    }
}
#endif
