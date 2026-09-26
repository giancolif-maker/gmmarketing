import XCTest
@testable import LyricsCore

final class LRCParserTests: XCTestCase {
    func testParsesLineTimestampsAndEstimatesWords() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse("""
        [ar:Queen]
        [ti:Bohemian Rhapsody]
        [00:00.15] Is this the real life? Is this just fantasy?
        [00:07.13] Caught in a landslide, no escape from reality
        """, trackDuration: 355))

        XCTAssertFalse(lyrics.isWordSynced)
        XCTAssertEqual(lyrics.lines.count, 2)
        XCTAssertEqual(lyrics.lines[0].start, 0.15, accuracy: 0.001)
        XCTAssertEqual(lyrics.lines[0].end, 7.13, accuracy: 0.001)
        XCTAssertEqual(lyrics.lines[0].text, "Is this the real life? Is this just fantasy?")

        let words = lyrics.lines[0].words
        XCTAssertEqual(words.count, 9)
        XCTAssertEqual(words.first!.start, 0.15, accuracy: 0.001)
        // Contiguous, increasing, and finished before the next line.
        for (a, b) in zip(words, words.dropFirst()) {
            XCTAssertEqual(a.end, b.start, accuracy: 0.0001)
            XCTAssertLessThan(a.start, b.start)
        }
        XCTAssertLessThan(words.last!.end, 7.13)
        // Last line runs to the end of the track.
        XCTAssertEqual(lyrics.lines[1].end, 355, accuracy: 0.001)
    }

    func testShortLineBeforeLongGapIsNotStretched() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse("[00:10.00]Oh yeah\n[00:40.00]Next"))
        let words = lyrics.lines[0].words
        XCTAssertLessThanOrEqual(words.last!.end - 10, 2.0)
    }

    func testEnhancedWordTags() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse(
            "[00:12.00]<00:12.00> Hello <00:12.50> darkness <00:13.40> my <00:13.70> old <00:14.00> friend <00:15.00>\n[00:16.00]Next"
        ))
        XCTAssertTrue(lyrics.isWordSynced)
        let words = lyrics.lines[0].words
        XCTAssertEqual(words.map(\.text), ["Hello", "darkness", "my", "old", "friend"])
        XCTAssertEqual(words[1].start, 12.5, accuracy: 0.001)
        XCTAssertEqual(words[1].end, 13.4, accuracy: 0.001)
        XCTAssertEqual(words[4].end, 15.0, accuracy: 0.001)
    }

    func testEnhancedSyllableTagsMergeIntoWords() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse("[00:01.00]<00:01.00>beau<00:01.20>ti<00:01.40>ful <00:02.00>day"))
        let words = lyrics.lines[0].words
        XCTAssertEqual(words.map(\.text), ["beautiful", "day"])
        XCTAssertEqual(words[0].start, 1.0, accuracy: 0.001)
        XCTAssertEqual(words[0].end, 2.0, accuracy: 0.001)
    }

    func testRepeatedTimestampsOffsetAndBreaks() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse("""
        [offset:500]
        [00:05.00][00:20.00]Chorus line
        [00:10.00]Verse line
        [00:15.00]
        """))
        XCTAssertEqual(lyrics.lines.map(\.text), ["Chorus line", "Verse line", "", "Chorus line"])
        XCTAssertEqual(lyrics.lines[0].start, 4.5, accuracy: 0.001)
        XCTAssertTrue(lyrics.lines[2].isBreak)
    }

    func testTimestampFormats() {
        XCTAssertEqual(LRCParser.parseTimestamp("01:02.50")!, 62.5, accuracy: 0.001)
        XCTAssertEqual(LRCParser.parseTimestamp("01:02.500")!, 62.5, accuracy: 0.001)
        XCTAssertEqual(LRCParser.parseTimestamp("01:02:50")!, 62.5, accuracy: 0.001)
        XCTAssertEqual(LRCParser.parseTimestamp("01:02")!, 62, accuracy: 0.001)
        XCTAssertNil(LRCParser.parseTimestamp("ar:Queen"))
        XCTAssertNil(LRCParser.parseTimestamp("length"))
    }

    func testLineAndWordLookup() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse("[00:01.00]one two\n[00:05.00]three\n[00:09.00]four"))
        XCTAssertNil(lyrics.lineIndex(at: 0.5))
        XCTAssertEqual(lyrics.lineIndex(at: 1.0), 0)
        XCTAssertEqual(lyrics.lineIndex(at: 6), 1)
        XCTAssertEqual(lyrics.lineIndex(at: 100), 2)
        XCTAssertEqual(lyrics.lines[0].wordIndex(at: 1.01), 0)
        XCTAssertEqual(lyrics.lines[0].wordIndex(at: 4.9), 1)
        XCTAssertNil(lyrics.lines[0].wordIndex(at: 0.9))

        XCTAssertEqual(lyrics.words.map(\.text), ["one", "two", "three", "four"])
        XCTAssertNil(lyrics.wordIndex(at: 0.5))
        XCTAssertEqual(lyrics.wordIndex(at: 1.01), 0)
        XCTAssertEqual(lyrics.wordIndex(at: 5.5), 2)
        XCTAssertEqual(lyrics.wordIndex(at: 100), 3)
    }

    func testRowsBalanceAndStayWithinLines() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse("""
        [00:01.00]one two three four five six seven
        [00:05.00]
        [00:08.00]eight nine
        """))
        XCTAssertEqual(lyrics.rows, [0..<3, 3..<5, 5..<7, 7..<9])
        XCTAssertEqual(lyrics.rowOfWord, [0, 0, 0, 1, 1, 2, 2, 3, 3])
    }

    func testEmphasisPicksLongestMeaningfulWordPerRow() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse("""
        [00:01.00]wait another minute
        [00:04.00]I'm stunning tonight
        [00:07.00]with you
        [00:09.00]dancing forever alone
        """))
        let marked = lyrics.words.indices.compactMap { i in lyrics.emphasis[i].map { (lyrics.words[i].text, $0) } }
        XCTAssertEqual(marked.map(\.0), ["another", "stunning", "dancing"])
        XCTAssertEqual(marked.map(\.1), [.highlight, .underline, .highlight])
    }

    func testInstrumentalGap() throws {
        let lyrics = try XCTUnwrap(LRCParser.parse("[00:10.00]hello there\n[00:40.00]back again"))
        XCTAssertTrue(lyrics.isInstrumentalGap(at: 2))     // long intro
        XCTAssertFalse(lyrics.isInstrumentalGap(at: 7))    // first word imminent
        XCTAssertFalse(lyrics.isInstrumentalGap(at: 10.5)) // singing
        XCTAssertTrue(lyrics.isInstrumentalGap(at: 25))    // mid-song break
        XCTAssertFalse(lyrics.isInstrumentalGap(at: 39.5)) // about to resume
    }

    func testGarbageReturnsNil() {
        XCTAssertNil(LRCParser.parse("just some plain lyrics\nwith no timestamps"))
    }
}

final class LRCLibClientTests: XCTestCase {
    func testCleanTitle() {
        XCTAssertEqual(LRCLibClient.cleanTitle("Here Comes The Sun - Remastered 2009"), "Here Comes The Sun")
        XCTAssertEqual(LRCLibClient.cleanTitle("Stay (with Justin Bieber)"), "Stay")
        XCTAssertEqual(LRCLibClient.cleanTitle("Song [Deluxe] (feat. X)"), "Song")
        XCTAssertEqual(LRCLibClient.cleanTitle("Plain"), "Plain")
    }

    func testPrimaryArtist() {
        XCTAssertEqual(LRCLibClient.primaryArtist("Calvin Harris, Dua Lipa"), "Calvin Harris")
        XCTAssertEqual(LRCLibClient.primaryArtist("Simon & Garfunkel"), "Simon")
        XCTAssertEqual(LRCLibClient.primaryArtist("Adele"), "Adele")
    }

    /// Hits the real API; skipped unless LOCKLYRICS_NETWORK_TESTS=1.
    func testLiveLookup() async throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["LOCKLYRICS_NETWORK_TESTS"] == "1")
        let client = LRCLibClient()
        let lyrics = await client.lyrics(for: TrackQuery(
            title: "Bohemian Rhapsody - Remastered 2011", artist: "Queen", album: "A Night At The Opera", duration: 354
        ))
        let found = try XCTUnwrap(lyrics)
        XCTAssertGreaterThan(found.lines.count, 20)
    }
}

final class EmojiMapTests: XCTestCase {
    func testLookupsAndStemming() {
        XCTAssertEqual(EmojiMap.emoji(for: "Love,"), "❤️")
        XCTAssertEqual(EmojiMap.emoji(for: "hearts"), "❤️")
        XCTAssertEqual(EmojiMap.emoji(for: "dancing"), "💃")
        XCTAssertEqual(EmojiMap.emoji(for: "cried"), "😢")
        XCTAssertEqual(EmojiMap.emoji(for: "stars"), "✨")
        XCTAssertEqual(EmojiMap.emoji(for: "moon’s"), "🌙")
        XCTAssertEqual(EmojiMap.emoji(for: "wait"), "⏳")
        XCTAssertEqual(EmojiMap.emoji(for: "minute"), "🕐")
        XCTAssertNil(EmojiMap.emoji(for: "the"))
        XCTAssertNil(EmojiMap.emoji(for: "..."))
    }
}
