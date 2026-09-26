import Foundation

/// A single word with the time range (in seconds) during which it is being sung.
public struct LyricWord: Sendable, Equatable {
    public let text: String
    public let start: Double
    public let end: Double

    public init(text: String, start: Double, end: Double) {
        self.text = text
        self.start = start
        self.end = end
    }

    /// 0 before the word starts, 1 once it has been sung, linear in between.
    public func progress(at time: Double) -> Double {
        if time <= start { return 0 }
        if time >= end { return 1 }
        return (time - start) / max(end - start, 0.001)
    }
}

public struct LyricLine: Sendable, Equatable {
    public let start: Double
    /// Start of the next line (or end of track) — when this line leaves the screen.
    public let end: Double
    public let words: [LyricWord]

    public init(start: Double, end: Double, words: [LyricWord]) {
        self.start = start
        self.end = end
        self.words = words
    }

    public var text: String { words.map(\.text).joined(separator: " ") }

    /// Empty lines in LRC files mark instrumental breaks.
    public var isBreak: Bool { words.isEmpty }

    /// Index of the last word that has started at `time`, or nil if none has.
    public func wordIndex(at time: Double) -> Int? {
        words.lastIndex { $0.start <= time }
    }
}

public struct Lyrics: Sendable, Equatable {
    public let lines: [LyricLine]
    /// True when the source had real per-word timestamps (enhanced LRC);
    /// false when word timing was estimated from line timestamps.
    public let isWordSynced: Bool
    /// Every word of every line, in order — for word-at-a-time display.
    public let words: [LyricWord]
    /// Lines re-broken into short rows (ranges into `words`) of at most
    /// `maxWordsPerRow` words, never spanning two lyric lines.
    public let rows: [Range<Int>]
    /// For each index in `words`, the index of its row in `rows`.
    public let rowOfWord: [Int]

    public static let maxWordsPerRow = 3

    public init(lines: [LyricLine], isWordSynced: Bool) {
        self.lines = lines
        self.isWordSynced = isWordSynced
        self.words = lines.flatMap(\.words)

        var rows: [Range<Int>] = []
        var rowOfWord: [Int] = []
        var cursor = 0
        for line in lines where !line.words.isEmpty {
            // Balance the rows: 7 words -> 3/2/2 rather than 3/3/1.
            let count = line.words.count
            let rowCount = (count + Self.maxWordsPerRow - 1) / Self.maxWordsPerRow
            for row in 0..<rowCount {
                let size = count / rowCount + (row < count % rowCount ? 1 : 0)
                rowOfWord += Array(repeating: rows.count, count: size)
                rows.append(cursor..<(cursor + size))
                cursor += size
            }
        }
        self.rows = rows
        self.rowOfWord = rowOfWord
    }

    /// True during long pauses (intros, solos) when no word is being sung
    /// and the next one isn't imminent.
    public func isInstrumentalGap(at time: Double) -> Bool {
        guard !words.isEmpty else { return true }
        guard let current = wordIndex(at: time) else { return words[0].start - time > 4 }
        let nextStart = current + 1 < words.count ? words[current + 1].start : .infinity
        return time > words[current].end + 2 && nextStart - time > 1
    }

    /// Index into `words` of the last word that has started at `time`.
    public func wordIndex(at time: Double) -> Int? {
        var low = 0
        var high = words.count - 1
        var found: Int?
        while low <= high {
            let mid = (low + high) / 2
            if words[mid].start <= time {
                found = mid
                low = mid + 1
            } else {
                high = mid - 1
            }
        }
        return found
    }

    /// Index of the line being sung at `time` (last line whose start <= time).
    public func lineIndex(at time: Double) -> Int? {
        var low = 0
        var high = lines.count - 1
        var found: Int?
        while low <= high {
            let mid = (low + high) / 2
            if lines[mid].start <= time {
                found = mid
                low = mid + 1
            } else {
                high = mid - 1
            }
        }
        return found
    }
}
