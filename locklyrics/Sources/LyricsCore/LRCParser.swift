import Foundation

/// Parses LRC lyrics, including the "enhanced" A2 extension with per-word
/// `<mm:ss.xx>` tags. When a line has no word tags, word timing is estimated
/// by spreading the line's duration across its words, weighted by length.
public enum LRCParser {
    public static func parse(_ source: String, trackDuration: Double? = nil) -> Lyrics? {
        var offset = 0.0
        var timed: [(time: Double, body: String)] = []

        for rawLine in source.components(separatedBy: .newlines) {
            var rest = Substring(rawLine.trimmingCharacters(in: .whitespaces))
            var times: [Double] = []

            // Consume every leading [...] tag: timestamps or metadata.
            while rest.hasPrefix("["), let close = rest.firstIndex(of: "]") {
                let tag = rest[rest.index(after: rest.startIndex)..<close]
                if let time = parseTimestamp(tag) {
                    times.append(time)
                } else if tag.lowercased().hasPrefix("offset:") {
                    let value = tag.dropFirst("offset:".count).trimmingCharacters(in: .whitespaces)
                    offset = (Double(value) ?? 0) / 1000
                }
                rest = rest[rest.index(after: close)...]
            }

            let body = rest.trimmingCharacters(in: .whitespaces)
            for time in times {
                timed.append((time, body))
            }
        }

        guard !timed.isEmpty else { return nil }

        // Stable sort: lines with repeated timestamps keep file order.
        timed = timed.enumerated()
            .sorted { $0.element.time == $1.element.time ? $0.offset < $1.offset : $0.element.time < $1.element.time }
            .map { ($0.element.time - offset, $0.element.body) }

        var lines: [LyricLine] = []
        var sawWordTags = false

        for (index, entry) in timed.enumerated() {
            let start = max(0, entry.time)
            let fallbackEnd = max(trackDuration ?? 0, start + 6)
            let end = index + 1 < timed.count ? max(start, timed[index + 1].time) : fallbackEnd

            let words: [LyricWord]
            if let tagged = parseWordTags(entry.body, lineStart: start, lineEnd: end) {
                sawWordTags = true
                words = tagged
            } else {
                words = estimateWords(entry.body, lineStart: start, lineEnd: end)
            }
            lines.append(LyricLine(start: start, end: end, words: words))
        }

        return Lyrics(lines: lines, isWordSynced: sawWordTags)
    }

    // MARK: - Timestamps

    /// Accepts `mm:ss`, `mm:ss.xx`, `mm:ss.xxx`, `mm:ss:xx` and `hh:mm:ss.xx`.
    static func parseTimestamp<S: StringProtocol>(_ text: S) -> Double? {
        let parts = text.split(separator: ":", omittingEmptySubsequences: false)
        guard parts.count >= 2, parts.count <= 3,
              parts.allSatisfy({ !$0.isEmpty && $0.allSatisfy { $0.isNumber || $0 == "." } })
        else { return nil }

        if parts.count == 3, !parts[2].contains("."), let m = Double(parts[0]), let s = Double(parts[1]),
           parts[1].count == 2, parts[2].count <= 3, let frac = Double(parts[2]) {
            // mm:ss:xx (centiseconds with a colon separator)
            let divisor = parts[2].count == 3 ? 1000.0 : 100.0
            return m * 60 + s + frac / divisor
        }

        var total = 0.0
        for part in parts {
            guard let value = Double(part) else { return nil }
            total = total * 60 + value
        }
        return total
    }

    // MARK: - Enhanced LRC word tags

    /// Returns nil when the body contains no `<mm:ss.xx>` tags.
    static func parseWordTags(_ body: String, lineStart: Double, lineEnd: Double) -> [LyricWord]? {
        guard body.contains("<") else { return nil }

        var segments: [(time: Double, text: String)] = []
        var leading = ""
        var rest = Substring(body)
        while let open = rest.firstIndex(of: "<") {
            let text = String(rest[..<open])
            guard let close = rest[open...].firstIndex(of: ">"),
                  let time = parseTimestamp(rest[rest.index(after: open)..<close])
            else { return nil }
            if segments.isEmpty {
                leading += text
            } else {
                segments[segments.count - 1].text += text
            }
            segments.append((time, ""))
            rest = rest[rest.index(after: close)...]
        }
        guard !segments.isEmpty else { return nil }
        segments[segments.count - 1].text += rest

        // Untagged text before the first tag belongs to the line start.
        if !leading.trimmingCharacters(in: .whitespaces).isEmpty {
            segments.insert((lineStart, leading), at: 0)
        }

        // Segments may be whole words ("<t>word ") or syllables ("<t>beau<t>ti<t>ful ").
        // Merge syllables that aren't separated by whitespace into one word.
        var words: [LyricWord] = []
        var joinNext = false
        for (index, segment) in segments.enumerated() {
            let segmentEnd = index + 1 < segments.count ? segments[index + 1].time : lineEnd
            let pieces = segment.text.split(whereSeparator: \.isWhitespace)
            let startsWithSpace = segment.text.first?.isWhitespace ?? true
            let endsWithSpace = segment.text.last?.isWhitespace ?? true

            guard !pieces.isEmpty else {
                joinNext = false
                continue
            }

            // Multiple words in one segment: split its time range evenly.
            let span = max(segmentEnd - segment.time, 0) / Double(pieces.count)
            for (pieceIndex, piece) in pieces.enumerated() {
                let start = segment.time + span * Double(pieceIndex)
                let end = start + span
                if pieceIndex == 0, joinNext, !startsWithSpace, let last = words.popLast() {
                    words.append(LyricWord(text: last.text + piece, start: last.start, end: end))
                } else {
                    words.append(LyricWord(text: String(piece), start: start, end: end))
                }
            }
            joinNext = !endsWithSpace
        }
        return words
    }

    // MARK: - Estimated word timing

    /// Words take roughly this many seconds each at most; a short line followed
    /// by a long instrumental gap shouldn't stretch across the whole gap.
    static let maxSecondsPerWord = 0.75

    static func estimateWords(_ body: String, lineStart: Double, lineEnd: Double) -> [LyricWord] {
        let pieces = body.split(whereSeparator: \.isWhitespace).map(String.init)
        guard !pieces.isEmpty else { return [] }

        let available = max(lineEnd - lineStart, 0.3)
        let sungSpan = min(available * 0.92, max(1.2, Double(pieces.count) * maxSecondsPerWord))

        let weights = pieces.map { piece -> Double in
            let letters = Double(piece.filter { $0.isLetter || $0.isNumber }.count)
            let pause = piece.last.map { ",.;:!?—-".contains($0) } == true ? 2.0 : 0.0
            return max(letters, 2) + 1 + pause
        }
        let totalWeight = weights.reduce(0, +)

        var words: [LyricWord] = []
        var cursor = lineStart
        for (piece, weight) in zip(pieces, weights) {
            let duration = sungSpan * weight / totalWeight
            words.append(LyricWord(text: piece, start: cursor, end: cursor + duration))
            cursor += duration
        }
        return words
    }
}
