import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct TrackQuery: Sendable, Hashable {
    public let title: String
    public let artist: String
    public let album: String
    /// Seconds.
    public let duration: Double

    public init(title: String, artist: String, album: String, duration: Double) {
        self.title = title
        self.artist = artist
        self.album = album
        self.duration = duration
    }
}

/// Client for https://lrclib.net — a free, open, keyless synced-lyrics database.
public actor LRCLibClient {
    private struct Record: Decodable {
        let trackName: String?
        let artistName: String?
        let duration: Double?
        let instrumental: Bool?
        let syncedLyrics: String?
    }

    private enum CacheEntry {
        case found(Lyrics)
        case missing
    }

    private let session: URLSession
    private let baseURL: URL
    private let userAgent: String
    private var cache: [TrackQuery: CacheEntry] = [:]

    public init(
        session: URLSession = .shared,
        baseURL: URL = URL(string: "https://lrclib.net/api")!,
        userAgent: String = "LockLyrics/1.0 (https://github.com/giancolif-maker/gmmarketing)"
    ) {
        self.session = session
        self.baseURL = baseURL
        self.userAgent = userAgent
    }

    /// Synced lyrics for the track, or nil if none exist (or the network failed).
    public func lyrics(for query: TrackQuery) async -> Lyrics? {
        if let cached = cache[query] {
            if case .found(let lyrics) = cached { return lyrics }
            return nil
        }

        do {
            let result = try await lookup(query)
            cache[query] = result.map(CacheEntry.found) ?? .missing
            return result
        } catch {
            // Network errors aren't cached so the next track change retries.
            return nil
        }
    }

    private func lookup(_ query: TrackQuery) async throws -> Lyrics? {
        // 1. Exact match (LRCLIB tolerates ±2s on duration).
        if !query.album.isEmpty, query.duration > 0 {
            let record: Record? = try await fetch("get", [
                "track_name": query.title,
                "artist_name": query.artist,
                "album_name": query.album,
                "duration": String(Int(query.duration.rounded())),
            ])
            if let record, let lyrics = parse(record, duration: query.duration) {
                return lyrics
            }
        }

        // 2. Search by title + artist, then by a cleaned-up title
        //    ("Song - Remastered 2011" / "Song (feat. X)" -> "Song").
        var titles = [query.title]
        let cleaned = Self.cleanTitle(query.title)
        if cleaned != query.title, !cleaned.isEmpty { titles.append(cleaned) }

        // Full artist first ("Tyler, The Creator" is one artist), then the first-listed one.
        var artists = [query.artist]
        let primary = Self.primaryArtist(query.artist)
        if primary != query.artist { artists.append(primary) }

        for artist in artists {
            for title in titles {
                let records: [Record] = try await fetch("search", [
                    "track_name": title,
                    "artist_name": artist,
                ]) ?? []
                if let best = Self.bestMatch(records, duration: query.duration),
                   let lyrics = parse(best, duration: query.duration) {
                    return lyrics
                }
            }
        }
        return nil
    }

    private func parse(_ record: Record, duration: Double) -> Lyrics? {
        guard record.instrumental != true, let synced = record.syncedLyrics, !synced.isEmpty else { return nil }
        return LRCParser.parse(synced, trackDuration: duration > 0 ? duration : record.duration)
    }

    private static func bestMatch(_ records: [Record], duration: Double) -> Record? {
        let synced = records.filter { $0.instrumental != true && !($0.syncedLyrics ?? "").isEmpty }
        guard duration > 0 else { return synced.first }
        // Closest duration within 8 seconds; different edits/live versions drift badly.
        return synced
            .map { ($0, abs(($0.duration ?? duration) - duration)) }
            .filter { $0.1 <= 8 }
            .min { $0.1 < $1.1 }?.0
    }

    private func fetch<T: Decodable>(_ endpoint: String, _ params: [String: String]) async throws -> T? {
        var components = URLComponents(url: baseURL.appendingPathComponent(endpoint), resolvingAgainstBaseURL: false)!
        components.queryItems = params.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }

        var request = URLRequest(url: components.url!)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.timeoutInterval = 10

        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 404 { return nil }
        guard (200..<300).contains(status) else { throw URLError(.badServerResponse) }
        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: - Title cleanup

    /// Strips version/feature suffixes that streaming services add but lyric
    /// databases usually don't have.
    public static func cleanTitle(_ title: String) -> String {
        var result = title
        // "Song - Remastered 2011", "Song - Live at Wembley", "Song - Radio Edit"
        if let dash = result.range(of: " - ") {
            result = String(result[..<dash.lowerBound])
        }
        // "Song (feat. X)", "Song [Deluxe]"
        for (open, close) in [("(", ")"), ("[", "]")] {
            while let start = result.range(of: open),
                  let end = result.range(of: close, range: start.upperBound..<result.endIndex) {
                result.removeSubrange(start.lowerBound..<end.upperBound)
            }
        }
        return result.trimmingCharacters(in: .whitespaces)
    }

    /// "Artist A, Artist B" / "Artist A & Artist B" -> "Artist A".
    public static func primaryArtist(_ artist: String) -> String {
        for separator in [", ", " & ", " feat. ", " ft. ", " x "] {
            if let range = artist.range(of: separator) {
                return String(artist[..<range.lowerBound])
            }
        }
        return artist
    }
}
