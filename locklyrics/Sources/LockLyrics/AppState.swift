#if canImport(AppKit)
import AppKit
import LyricsCore

enum LyricsStatus: Equatable {
    case idle, loading, found, notFound
}

/// Tracks what's playing, its lyrics and artwork palette, and lock state.
@MainActor
final class AppState: ObservableObject {
    @Published private(set) var track: PlayerSnapshot?
    @Published private(set) var isPlaying = false
    @Published private(set) var lyrics: Lyrics?
    @Published private(set) var lyricsStatus: LyricsStatus = .idle
    @Published private(set) var artworkPalette: Palette?
    @Published private(set) var isLocked = false
    @Published private(set) var isPreviewing = false
    /// Set by Esc / "Hide Lyrics"; cleared by the next track or the next lock.
    @Published private(set) var isDismissed = false
    @Published private(set) var permissionProblem: PlayerApp?

    private let reader = PlayerReader()
    private let lyricsClient = LRCLibClient()
    private var tasks: [Task<Void, Never>] = []
    private var trackTask: Task<Void, Never>?
    private var previewTask: Task<Void, Never>?

    // Playback clock: position = anchorPosition + (now - anchorDate) while playing.
    private var anchorPosition = 0.0
    private var anchorDate = Date()

    func position(at date: Date) -> Double {
        isPlaying ? anchorPosition + date.timeIntervalSince(anchorDate) : anchorPosition
    }

    func start() {
        isLocked = Self.screenIsLocked()

        tasks.append(Task { [weak self] in
            while !Task.isCancelled {
                self?.poll()
                try? await Task.sleep(for: .milliseconds(500))
            }
        })

        let center = DistributedNotificationCenter.default()
        tasks.append(Task { [weak self] in
            for await _ in center.notifications(named: .init("com.apple.screenIsLocked")) {
                self?.isLocked = true
                self?.isDismissed = false
            }
        })
        tasks.append(Task { [weak self] in
            for await _ in center.notifications(named: .init("com.apple.screenIsUnlocked")) {
                self?.isLocked = false
            }
        })
    }

    /// Show the overlay on the desktop for a few seconds so settings can be tried out.
    func preview(seconds: Double = 10) {
        previewTask?.cancel()
        isDismissed = false
        isPreviewing = true
        previewTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(seconds))
            guard !Task.isCancelled else { return }
            self?.isPreviewing = false
        }
    }

    /// Hide the lyrics until the next song starts or the screen is locked again.
    func dismiss() {
        previewTask?.cancel()
        isPreviewing = false
        isDismissed = true
    }

    private func poll() {
        let snapshot: PlayerSnapshot?
        do {
            snapshot = try reader.read()
            if permissionProblem != nil { permissionProblem = nil }
        } catch PlayerReadError.notAuthorized(let app) {
            if permissionProblem != app { permissionProblem = app }
            snapshot = nil
        } catch {
            snapshot = nil
        }

        guard let snapshot else {
            if track != nil { track = nil }
            if isPlaying { isPlaying = false }
            return
        }

        if snapshot.trackID != track?.trackID {
            trackChanged(to: snapshot)
        }
        track = snapshot

        // Re-anchor the clock on play/pause, seeks, or drift beyond 0.3s;
        // otherwise keep interpolating so highlighting stays smooth between polls.
        let now = Date()
        let predicted = position(at: now)
        if snapshot.isPlaying != isPlaying || abs(predicted - snapshot.position) > 0.3 {
            anchorPosition = snapshot.position
            anchorDate = now
        }
        if isPlaying != snapshot.isPlaying { isPlaying = snapshot.isPlaying }
    }

    private func trackChanged(to snapshot: PlayerSnapshot) {
        trackTask?.cancel()
        isDismissed = false
        lyrics = nil
        lyricsStatus = .loading
        artworkPalette = nil

        let query = TrackQuery(title: snapshot.title, artist: snapshot.artist, album: snapshot.album, duration: snapshot.duration)
        trackTask = Task { [weak self, lyricsClient, reader] in
            async let fetchedLyrics = lyricsClient.lyrics(for: query)
            let artwork = await reader.artwork(for: snapshot)
            let palette = artwork.flatMap(PaletteExtractor.palette(from:))
            let result = await fetchedLyrics

            guard let self, !Task.isCancelled, self.track?.trackID == snapshot.trackID else { return }
            self.artworkPalette = palette
            self.lyrics = result
            self.lyricsStatus = result == nil ? .notFound : .found
        }
    }

    private static func screenIsLocked() -> Bool {
        guard let session = CGSessionCopyCurrentDictionary() as? [String: Any] else { return false }
        return session["CGSSessionScreenIsLocked"] as? Bool ?? false
    }
}
#endif
