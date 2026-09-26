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
            ZStack {
                // Black backdrop so the lyrics hit hard instead of fighting the wallpaper.
                Color(nsColor: settings.backgroundColor).opacity(settings.backgroundOpacity)
                TimelineView(.animation(minimumInterval: 1.0 / 30)) { timeline in
                    let time = state.position(at: timeline.date) + settings.offset
                    content(time: time, size: geometry.size)
                        .frame(maxWidth: geometry.size.width * 0.9)
                        .position(x: geometry.size.width / 2, y: geometry.size.height * settings.verticalPosition)
                }
            }
        }
        .ignoresSafeArea()
    }

    @ViewBuilder
    private func content(time: Double, size: CGSize) -> some View {
        let renderer = LineRenderer(palette: palette, fontSize: size.height * 0.07 * settings.textScale)
        if let lyrics = state.lyrics {
            let index = lyrics.lineIndex(at: time)
            switch settings.style {
            case .fisheye:
                FisheyeStyle(lyrics: lyrics, time: time, screen: size, palette: palette,
                             scale: settings.textScale, showEmoji: settings.showEmoji)
            case .words, .visual:
                WordsStyle(lyrics: lyrics, time: time, screen: size, palette: palette,
                           scale: settings.textScale, showEmoji: settings.style == .visual)
            case .stack: StackStyle(lyrics: lyrics, index: index, time: time, renderer: renderer)
            case .drift: DriftStyle(lyrics: lyrics, index: index, time: time, renderer: renderer)
            case .lens: LensStyle(lyrics: lyrics, index: index, time: time, renderer: renderer)
            }
        } else {
            Text(placeholder)
                .font(renderer.font(scale: 0.6))
                .foregroundStyle(Color(nsColor: palette.lyric))
                .legibleShadow()
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
}

extension View {
    /// Soft dark halo plus a tight shadow so text reads on bright wallpapers.
    func legibleShadow(_ strength: Double = 1) -> some View {
        shadow(color: .black.opacity(0.55 * strength), radius: 18)
            .shadow(color: .black.opacity(0.35 * strength), radius: 3, y: 1)
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
            .legibleShadow()
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

/// One big word at a time: the word being sung fills the screen, the words just
/// sung shrink away above it, and the next word waits below in a highlight chip.
struct WordsStyle: View {
    let lyrics: Lyrics
    let time: Double
    let screen: CGSize
    let palette: Palette
    let scale: Double
    let showEmoji: Bool

    private var bigFont: Double { screen.height * 0.16 * scale }

    /// Where a word sits relative to the current one (y is a fraction of screen height).
    private func slot(_ relative: Int) -> (y: Double, scale: Double, opacity: Double) {
        switch relative {
        case ...(-2): (-0.24, 0.28, 0.35)
        case -1: (-0.155, 0.42, 0.75)
        case 0: (0, 1, 1)
        default: (0.155, 0.4, 0.95)
        }
    }

    var body: some View {
        let current = lyrics.wordIndex(at: time)
        let showNotes = lyrics.isInstrumentalGap(at: time)
        ZStack {
            if showNotes {
                notes
            } else {
                let center = current ?? -1
                ForEach(Array(max(0, center - 2)...min(lyrics.words.count - 1, center + 1)), id: \.self) { index in
                    word(index, relative: index - center)
                }
            }
        }
        .frame(width: screen.width * 0.9)
        .animation(.spring(response: 0.42, dampingFraction: 0.78), value: current)
        .animation(.easeInOut(duration: 0.4), value: showNotes)
    }

    private func word(_ index: Int, relative: Int) -> some View {
        let word = lyrics.words[index]
        let place = slot(relative)
        let isNext = relative >= 1
        let textColor: NSColor = relative == 0 ? palette.highlight : isNext ? chipTextColor : palette.lyric

        return HStack(spacing: bigFont * 0.12) {
            Text(word.text)
                .foregroundStyle(Color(nsColor: textColor))
            if showEmoji, let emoji = EmojiMap.emoji(for: word.text) {
                Text(emoji).font(.system(size: bigFont * 0.55))
            }
        }
        .font(.system(size: bigFont, weight: .black))
        .lineLimit(1)
        .minimumScaleFactor(0.3)
        .padding(.horizontal, bigFont * 0.16)
        .background(
            RoundedRectangle(cornerRadius: bigFont * 0.14, style: .continuous)
                .fill(Color(nsColor: palette.highlight))
                .opacity(isNext ? 1 : 0)
        )
        .frame(maxWidth: screen.width * 0.9)
        .legibleShadow(isNext ? 0.4 : 1)
        .scaleEffect(place.scale)
        .opacity(place.opacity)
        .offset(y: place.y * screen.height * scale)
        .transition(.opacity)
    }

    /// Dark text on light highlight colors, white on dark ones.
    private var chipTextColor: NSColor {
        let c = palette.highlight.usingColorSpace(.sRGB) ?? palette.highlight
        let luminance = 0.2126 * c.redComponent + 0.7152 * c.greenComponent + 0.0722 * c.blueComponent
        return luminance > 0.6 ? NSColor(white: 0.08, alpha: 1) : .white
    }

    private var notes: some View {
        Text("♪  ♪  ♪")
            .font(.system(size: bigFont * 0.45, weight: .bold))
            .foregroundStyle(Color(nsColor: palette.lyric))
            .opacity(0.45 + 0.4 * sin(time * 3))
            .legibleShadow()
    }
}
/// Lyrics broken into rows of up to three words. The row being sung is large in
/// the middle; rows above and below shrink, blur and curve away like a fisheye lens.
struct FisheyeStyle: View {
    let lyrics: Lyrics
    let time: Double
    let screen: CGSize
    let palette: Palette
    let scale: Double
    let showEmoji: Bool

    private var bigFont: Double { screen.height * 0.12 * scale }
    private let reach = 3

    private func lensScale(_ distance: Int) -> Double { 1 / (1 + 0.6 * Double(abs(distance))) }

    /// Vertical center of a row `distance` rows away, stacking the shrunken rows edge to edge.
    private func lensOffset(_ distance: Int) -> Double {
        let rowHeight = bigFont * 1.2
        var y = 0.0
        for step in stride(from: 1, through: abs(distance), by: 1) {
            y += rowHeight * (lensScale(step - 1) + lensScale(step)) / 2 + bigFont * 0.08
        }
        return distance < 0 ? -y : y
    }

    var body: some View {
        let currentWord = lyrics.wordIndex(at: time)
        let center = currentWord.map { lyrics.rowOfWord[$0] } ?? -1
        let showNotes = lyrics.isInstrumentalGap(at: time)
        let low = max(0, center - reach)
        let high = min(lyrics.rows.count - 1, center + reach)

        ZStack {
            if showNotes || lyrics.rows.isEmpty {
                Text("♪  ♪  ♪")
                    .font(.system(size: bigFont * 0.6, weight: .bold))
                    .foregroundStyle(Color(nsColor: palette.highlight))
                    .opacity(0.45 + 0.4 * sin(time * 3))
            } else if low <= high {
                ForEach(Array(low...high), id: \.self) { row in
                    rowView(row, distance: row - center, currentWord: currentWord)
                }
            }
        }
        .frame(width: screen.width * 0.9)
        .animation(.spring(response: 0.5, dampingFraction: 0.82), value: center)
        .animation(.easeInOut(duration: 0.4), value: showNotes)
    }

    private func rowView(_ row: Int, distance: Int, currentWord: Int?) -> some View {
        let isCurrent = distance == 0
        let magnitude = Double(abs(distance))
        let indices = Array(lyrics.rows[row])
        let emojis = indices.map { showEmoji ? EmojiMap.emoji(for: lyrics.words[$0].text) : nil }

        // Shrink long rows to fit the screen (black-weight glyphs average ~0.62 em).
        let characters = indices.reduce(0) { $0 + lyrics.words[$1].text.count + 1 }
        let emojiCount = emojis.compactMap { $0 }.count
        let fitted = (screen.width * 0.86) / (0.62 * Double(characters) + 0.8 * Double(emojiCount))
        let fontSize = min(bigFont, fitted)

        return HStack(spacing: fontSize * 0.28) {
            ForEach(Array(indices.enumerated()), id: \.element) { position, index in
                FisheyeWord(
                    text: lyrics.words[index].text,
                    color: wordColor(index, isCurrent: isCurrent, distance: distance, currentWord: currentWord),
                    emoji: emojis[position],
                    emphasis: lyrics.emphasis[index],
                    emphasisProgress: emphasisProgress(index, distance: distance, currentWord: currentWord),
                    palette: palette,
                    fontSize: fontSize
                )
            }
        }
        .fixedSize()
        .shadow(color: Color(nsColor: palette.highlight).opacity(isCurrent ? 0.45 : 0), radius: bigFont * 0.25)
        .scaleEffect(lensScale(distance))
        .rotation3DEffect(.degrees(Double(distance) * -9), axis: (x: 1, y: 0, z: 0), perspective: 0.5)
        .blur(radius: magnitude * 1.8)
        .opacity(1 - magnitude * 0.22)
        .offset(y: lensOffset(distance))
        .transition(.opacity)
    }

    private func wordColor(_ index: Int, isCurrent: Bool, distance: Int, currentWord: Int?) -> NSColor {
        if !isCurrent {
            return distance < 0 ? palette.lyric.withAlphaComponent(0.8) : palette.secondary
        }
        guard let currentWord else { return palette.lyric.withAlphaComponent(0.35) }
        if index < currentWord { return palette.lyric }
        if index == currentWord { return palette.highlight }
        return palette.lyric.withAlphaComponent(0.35)
    }

    /// 0 until the word is sung, then grows to 1 across the word — drives the
    /// box fading in and the underline drawing across.
    private func emphasisProgress(_ index: Int, distance: Int, currentWord: Int?) -> Double {
        if distance < 0 { return 1 }
        if distance > 0 { return 0 }
        guard let currentWord, index <= currentWord else { return 0 }
        let word = lyrics.words[index]
        return min(1, (time - word.start) / max(min(word.end - word.start, 0.6), 0.15))
    }
}

/// One word in a Fisheye row, with its optional emoji and emphasis.
private struct FisheyeWord: View {
    let text: String
    let color: NSColor
    let emoji: String?
    let emphasis: Emphasis?
    let emphasisProgress: Double
    let palette: Palette
    let fontSize: Double

    var body: some View {
        let boxed = emphasis == .highlight
        let underlined = emphasis == .underline
        let progress = min(max(emphasisProgress, 0), 1)

        HStack(spacing: fontSize * 0.12) {
            Text(text)
                .font(.system(size: fontSize, weight: .black))
                .foregroundStyle(Color(nsColor: boxed && progress > 0.4 ? chipTextColor : color))
                .padding(.horizontal, boxed ? fontSize * 0.14 : 0)
                .background(
                    RoundedRectangle(cornerRadius: fontSize * 0.14, style: .continuous)
                        .fill(Color(nsColor: palette.highlight))
                        .scaleEffect(x: 0.85 + 0.15 * progress, y: 1)
                        .opacity(boxed ? progress : 0)
                )
                .overlay(alignment: .bottomLeading) {
                    if underlined {
                        GeometryReader { geometry in
                            Capsule()
                                .fill(Color(nsColor: palette.highlight))
                                .frame(width: geometry.size.width * progress, height: fontSize * 0.09)
                                .frame(maxHeight: .infinity, alignment: .bottom)
                                .offset(y: fontSize * 0.1)
                        }
                    }
                }
            if let emoji {
                Text(emoji)
                    .font(.system(size: fontSize * 0.5))
                    .opacity(emojiOpacity)
            }
        }
    }

    /// Emoji are "slight": faint until their word is reached.
    private var emojiOpacity: Double {
        color.alphaComponent < 0.5 ? 0.35 : 0.9
    }

    private var chipTextColor: NSColor {
        let c = palette.highlight.usingColorSpace(.sRGB) ?? palette.highlight
        let luminance = 0.2126 * c.redComponent + 0.7152 * c.greenComponent + 0.0722 * c.blueComponent
        return luminance > 0.6 ? NSColor(white: 0.08, alpha: 1) : .white
    }
}
#endif
