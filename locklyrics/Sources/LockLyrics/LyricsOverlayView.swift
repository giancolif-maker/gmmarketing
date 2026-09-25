#if canImport(AppKit)
import AppKit
import LyricsCore
import SwiftUI

struct LyricsOverlayView: View {
    @ObservedObject var state: AppState
    @ObservedObject var settings: Settings

    private var palette: Palette {
        settings.autoColors ? (state.artworkPalette ?? settings.manualPalette) : settings.manualPalette
    }

    var body: some View {
        GeometryReader { geometry in
            TimelineView(.animation(minimumInterval: 1.0 / 30)) { timeline in
                let time = state.position(at: timeline.date) + settings.offset
                content(time: time)
                    .frame(maxWidth: geometry.size.width * 0.8)
                    .position(x: geometry.size.width / 2, y: geometry.size.height * settings.verticalPosition)
            }
        }
        .ignoresSafeArea()
    }

    @ViewBuilder
    private func content(time: Double) -> some View {
        if let lyrics = state.lyrics {
            let index = lyrics.lineIndex(at: time)
            switch settings.style {
            case .stack: StackStyle(lyrics: lyrics, index: index, time: time, renderer: renderer)
            case .drift: DriftStyle(lyrics: lyrics, index: index, time: time, renderer: renderer)
            case .lens: LensStyle(lyrics: lyrics, index: index, time: time, renderer: renderer)
            case .visual: VisualStyle(lyrics: lyrics, index: index, time: time, renderer: renderer)
            }
        } else {
            Text(placeholder)
                .font(.system(size: settings.fontSize * 0.6, weight: .semibold, design: .rounded))
                .foregroundStyle(Color(nsColor: palette.secondary))
                .shadow(color: .black.opacity(0.4), radius: 8)
                .multilineTextAlignment(.center)
        }
    }

    private var placeholder: String {
        guard let track = state.track else { return "Play something in Spotify or Apple Music" }
        switch state.lyricsStatus {
        case .loading: return "Finding lyrics for \(track.title)…"
        case .notFound: return "No synced lyrics for \(track.title)"
        case .idle, .found: return track.title
        }
    }

    private var renderer: LineRenderer {
        LineRenderer(palette: palette, fontSize: settings.fontSize)
    }
}

// MARK: - Line rendering

/// Builds the text for a lyric line with per-word highlighting.
@MainActor
struct LineRenderer {
    let palette: Palette
    let fontSize: Double

    /// Seconds a word takes to fade from highlight back to the lyric color.
    private let settleDuration = 0.35

    func font(scale: Double = 1) -> Font {
        .system(size: fontSize * scale, weight: .heavy, design: .rounded)
    }

    /// The line being sung: upcoming words dim, the current word lit, sung words solid.
    func active(_ line: LyricLine, time: Double, scale: Double = 1) -> some View {
        styled(activeText(line, time: time), scale: scale)
    }

    /// A line that isn't being sung right now.
    func inactive(_ line: LyricLine, scale: Double, opacity: Double = 1) -> some View {
        styled(Text(line.isBreak ? "♪" : line.text).foregroundColor(Color(nsColor: palette.secondary)), scale: scale)
            .opacity(opacity)
    }

    private func styled(_ text: Text, scale: Double) -> some View {
        text
            .font(font(scale: scale))
            .multilineTextAlignment(.center)
            .lineLimit(3)
            .minimumScaleFactor(0.5)
            .shadow(color: .black.opacity(0.45), radius: 10, y: 2)
            .fixedSize(horizontal: false, vertical: true)
    }

    private func activeText(_ line: LyricLine, time: Double) -> Text {
        if line.isBreak {
            // Instrumental break: gently pulsing notes.
            let pulse = 0.55 + 0.45 * sin(time * 3)
            return Text("♪  ♪  ♪").foregroundColor(Color(nsColor: palette.secondary.withAlphaComponent(pulse)))
        }

        var result = Text("")
        for (index, word) in line.words.enumerated() {
            let color: NSColor
            if time < word.start {
                color = palette.lyric.withAlphaComponent(0.4)
            } else if time < word.end {
                // Quick fade-in so the word "lights" rather than snaps.
                let fadeIn = min((time - word.start) / 0.08, 1)
                color = palette.lyric.withAlphaComponent(0.4).mixed(with: palette.highlight, fadeIn)
            } else {
                color = palette.highlight.mixed(with: palette.lyric, (time - word.end) / settleDuration)
            }
            result = result + Text(index == 0 ? word.text : " " + word.text).foregroundColor(Color(nsColor: color))
        }
        return result
    }
}

// MARK: - Styles

private let lineAnimation = Animation.spring(response: 0.55, dampingFraction: 0.85)

/// Previous line, current line (large), next line.
struct StackStyle: View {
    let lyrics: Lyrics
    let index: Int?
    let time: Double
    let renderer: LineRenderer

    var body: some View {
        VStack(spacing: renderer.fontSize * 0.4) {
            if let index, index > 0 {
                renderer.inactive(lyrics.lines[index - 1], scale: 0.55, opacity: 0.6)
            }
            if let index {
                renderer.active(lyrics.lines[index], time: time)
                    .id(index)
                    .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
            }
            let next = (index ?? -1) + 1
            if next < lyrics.lines.count {
                renderer.inactive(lyrics.lines[next], scale: 0.55, opacity: index == nil ? 0.9 : 0.6)
            }
        }
        .animation(lineAnimation, value: index)
    }
}

/// Lines stacked on a receding 3D wall; sung lines drift up and away.
struct DriftStyle: View {
    let lyrics: Lyrics
    let index: Int?
    let time: Double
    let renderer: LineRenderer

    var body: some View {
        let current = index ?? -1
        let range = max(0, current - 4)...min(lyrics.lines.count - 1, current + 2)
        ZStack {
            ForEach(Array(range), id: \.self) { lineIndex in
                let distance = Double(lineIndex - current)
                Group {
                    if lineIndex == current {
                        renderer.active(lyrics.lines[lineIndex], time: time)
                    } else {
                        renderer.inactive(lyrics.lines[lineIndex], scale: 0.8, opacity: distance < 0 ? 0.55 : 0.8)
                    }
                }
                .rotation3DEffect(.degrees(distance * -14), axis: (x: 1, y: 0, z: 0), perspective: 0.6)
                .scaleEffect(1 - min(abs(distance), 4) * 0.1)
                .offset(y: distance * renderer.fontSize * 1.5)
                .opacity(1 - min(abs(distance), 4) * 0.2)
                .zIndex(-abs(distance))
            }
        }
        .animation(lineAnimation, value: current)
    }
}

/// Fisheye-style magnification: lines shrink and blur with distance from the current one.
struct LensStyle: View {
    let lyrics: Lyrics
    let index: Int?
    let time: Double
    let renderer: LineRenderer

    var body: some View {
        let current = index ?? -1
        let range = max(0, current - 3)...min(lyrics.lines.count - 1, current + 3)
        ZStack {
            ForEach(Array(range), id: \.self) { lineIndex in
                let distance = Double(lineIndex - current)
                let magnitude = abs(distance)
                let scale = 1 / (1 + 0.45 * magnitude)
                // Compressed spacing toward the edges, like looking through a lens.
                let y = (distance < 0 ? -1.0 : 1.0) * renderer.fontSize * 1.35 * (1 - exp(-magnitude * 0.9)) * 2.2
                Group {
                    if lineIndex == current {
                        renderer.active(lyrics.lines[lineIndex], time: time)
                    } else {
                        renderer.inactive(lyrics.lines[lineIndex], scale: 1, opacity: 0.85)
                    }
                }
                .scaleEffect(scale)
                .blur(radius: magnitude * 1.4)
                .offset(y: y)
                .opacity(1 - magnitude * 0.22)
            }
        }
        .animation(lineAnimation, value: current)
    }
}

/// Stack style plus an emoji that pops in beside the words it matches.
struct VisualStyle: View {
    let lyrics: Lyrics
    let index: Int?
    let time: Double
    let renderer: LineRenderer

    /// The most recent word in the current line (up to now) that has an emoji.
    private var currentEmoji: (key: String, emoji: String)? {
        guard let index else { return nil }
        let line = lyrics.lines[index]
        guard let wordIndex = line.wordIndex(at: time) else { return nil }
        for i in stride(from: wordIndex, through: 0, by: -1) {
            if let emoji = EmojiMap.emoji(for: line.words[i].text) {
                return ("\(index)-\(i)", emoji)
            }
        }
        return nil
    }

    var body: some View {
        let emoji = currentEmoji
        HStack(spacing: renderer.fontSize * 0.5) {
            StackStyle(lyrics: lyrics, index: index, time: time, renderer: renderer)
            ZStack {
                if let emoji {
                    Text(emoji.emoji)
                        .font(.system(size: renderer.fontSize * 1.6))
                        .shadow(color: .black.opacity(0.3), radius: 8)
                        .id(emoji.key)
                        .transition(.scale(scale: 0.2).combined(with: .opacity))
                }
            }
            .frame(width: renderer.fontSize * 2)
            .animation(.spring(response: 0.35, dampingFraction: 0.6), value: emoji?.key)
        }
    }
}
#endif
