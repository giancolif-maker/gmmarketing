#if canImport(AppKit)
import AppKit
import SwiftUI

enum LyricStyle: String, CaseIterable, Identifiable {
    case fisheye, words, visual, stack, drift, lens
    var id: String { rawValue }
    var title: String {
        switch self {
        case .fisheye: "Fisheye (3 words per line)"
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

/// A preset color scheme: background, lyric text, highlight and dim text.
struct Colorway: Identifiable, Equatable {
    let name: String
    let background: String
    let lyric: String
    let highlight: String
    let secondary: String
    var id: String { name }

    static let all: [Colorway] = [
        Colorway(name: "Red Noir", background: "#000000", lyric: "#D93A32", highlight: "#FF3B30", secondary: "#7A1F1B"),
        Colorway(name: "Ice Blue", background: "#000000", lyric: "#3D8BFF", highlight: "#FFFFFF", secondary: "#1E4A8C"),
        Colorway(name: "Midnight", background: "#050A1F", lyric: "#7FA7FF", highlight: "#FFFFFF", secondary: "#34457A"),
        Colorway(name: "Classic", background: "#000000", lyric: "#E6E6E6", highlight: "#FFD60A", secondary: "#6E6E6E"),
        Colorway(name: "Neon", background: "#000000", lyric: "#FF4FD8", highlight: "#00F0FF", secondary: "#7A2466"),
        Colorway(name: "Lime", background: "#000000", lyric: "#9DFF3C", highlight: "#FFFFFF", secondary: "#3F6B18"),
        Colorway(name: "Sunset", background: "#140504", lyric: "#FF8A3D", highlight: "#FFE14D", secondary: "#7A3A1A"),
        Colorway(name: "Purple Haze", background: "#0A0012", lyric: "#B388FF", highlight: "#FF6EC7", secondary: "#4B2A7A"),
        Colorway(name: "Gold", background: "#000000", lyric: "#D4AF37", highlight: "#FFFFFF", secondary: "#6B5A1E"),
        Colorway(name: "Mint", background: "#001410", lyric: "#3DFFC5", highlight: "#FFFFFF", secondary: "#1B6B55"),
    ]
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
    /// Opacity of the black backdrop behind the lyrics (0 = wallpaper shows through).
    @Published var backgroundHex: String { didSet { defaults.set(backgroundHex, forKey: "backgroundHex") } }
    @Published var backgroundOpacity: Double { didSet { defaults.set(backgroundOpacity, forKey: "backgroundOpacity") } }
    /// Small emoji beside matching words in the Fisheye style.
    @Published var showEmoji: Bool { didSet { defaults.set(showEmoji, forKey: "showEmoji") } }
    @Published var keepDisplayAwake: Bool { didSet { defaults.set(keepDisplayAwake, forKey: "keepDisplayAwake") } }

    private init() {
        style = LyricStyle(rawValue: defaults.string(forKey: "style") ?? "") ?? .fisheye
        displayMode = DisplayMode(rawValue: defaults.string(forKey: "displayMode") ?? "") ?? .lockScreenOnly
        autoColors = defaults.object(forKey: "autoColors") as? Bool ?? false
        lyricHex = defaults.string(forKey: "lyricHex") ?? "#D93A32"
        highlightHex = defaults.string(forKey: "highlightHex") ?? "#FF3B30"
        secondaryHex = defaults.string(forKey: "secondaryHex") ?? "#7A1F1B"
        textScale = defaults.object(forKey: "textScale") as? Double ?? 1
        verticalPosition = defaults.object(forKey: "verticalPosition") as? Double ?? 0.56
        offset = defaults.object(forKey: "offset") as? Double ?? 0.2
        backgroundHex = defaults.string(forKey: "backgroundHex") ?? "#000000"
        backgroundOpacity = defaults.object(forKey: "backgroundOpacity") as? Double ?? 1
        showEmoji = defaults.object(forKey: "showEmoji") as? Bool ?? true
        keepDisplayAwake = defaults.object(forKey: "keepDisplayAwake") as? Bool ?? true
    }

    /// The preset matching the current colors, or nil if they've been customized.
    var colorway: Colorway? {
        Colorway.all.first {
            $0.background == backgroundHex && $0.lyric == lyricHex
                && $0.highlight == highlightHex && $0.secondary == secondaryHex
        }
    }

    func apply(_ colorway: Colorway) {
        backgroundHex = colorway.background
        lyricHex = colorway.lyric
        highlightHex = colorway.highlight
        secondaryHex = colorway.secondary
        autoColors = false
    }

    var backgroundColor: NSColor { NSColor(hex: backgroundHex) ?? .black }

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
