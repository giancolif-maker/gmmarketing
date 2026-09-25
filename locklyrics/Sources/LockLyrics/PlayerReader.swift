#if canImport(AppKit)
import AppKit

enum PlayerApp: String, CaseIterable {
    case spotify = "Spotify"
    case music = "Music"

    var bundleID: String {
        switch self {
        case .spotify: "com.spotify.client"
        case .music: "com.apple.Music"
        }
    }

    var isRunning: Bool {
        !NSRunningApplication.runningApplications(withBundleIdentifier: bundleID).isEmpty
    }
}

struct PlayerSnapshot: Equatable {
    let app: PlayerApp
    let isPlaying: Bool
    let trackID: String
    let title: String
    let artist: String
    let album: String
    /// Seconds.
    let duration: Double
    /// Seconds.
    let position: Double
    let artworkURL: URL?
}

enum PlayerReadError: Error {
    /// The user denied (or hasn't yet granted) Automation permission.
    case notAuthorized(PlayerApp)
    case failed
}

/// Reads now-playing state from Spotify and Apple Music via AppleScript.
/// Only talks to apps that are already running — `tell application` would launch them.
@MainActor
final class PlayerReader {
    private var scripts: [PlayerApp: NSAppleScript] = [:]
    private var musicArtworkScript: NSAppleScript?

    private static let spotifySource = """
    tell application id "com.spotify.client"
        try
            if player state is stopped then return {"stopped"}
            if player state is playing then
                set s to "playing"
            else
                set s to "paused"
            end if
            set t to current track
            return {s, id of t, name of t, artist of t, album of t, (duration of t) / 1000, player position, artwork url of t}
        on error
            return {"stopped"}
        end try
    end tell
    """

    private static let musicSource = """
    tell application id "com.apple.Music"
        try
            if player state is stopped then return {"stopped"}
            if player state is playing then
                set s to "playing"
            else
                set s to "paused"
            end if
            set t to current track
            return {s, persistent ID of t, name of t, artist of t, album of t, duration of t, player position, ""}
        on error
            return {"stopped"}
        end try
    end tell
    """

    private static let musicArtworkSource = """
    tell application id "com.apple.Music"
        try
            return raw data of artwork 1 of current track
        on error
            return missing value
        end try
    end tell
    """

    /// The playing player if any; otherwise a paused one; otherwise nil.
    func read() throws -> PlayerSnapshot? {
        var paused: PlayerSnapshot?
        var authError: PlayerReadError?
        for app in PlayerApp.allCases where app.isRunning {
            do {
                guard let snapshot = try read(app) else { continue }
                if snapshot.isPlaying { return snapshot }
                paused = paused ?? snapshot
            } catch let error as PlayerReadError {
                authError = error
            }
        }
        if paused == nil, let authError { throw authError }
        return paused
    }

    private func read(_ app: PlayerApp) throws -> PlayerSnapshot? {
        let script = scripts[app] ?? NSAppleScript(source: app == .spotify ? Self.spotifySource : Self.musicSource)!
        scripts[app] = script

        var errorInfo: NSDictionary?
        let result = script.executeAndReturnError(&errorInfo)
        if let errorInfo {
            // -1743: errAEEventNotPermitted, -1744: would need user consent.
            let code = errorInfo[NSAppleScript.errorNumber] as? Int ?? 0
            if code == -1743 || code == -1744 { throw PlayerReadError.notAuthorized(app) }
            throw PlayerReadError.failed
        }

        guard result.numberOfItems >= 8, result.atIndex(1)?.stringValue != "stopped" else { return nil }
        func string(_ index: Int) -> String { result.atIndex(index)?.stringValue ?? "" }
        func number(_ index: Int) -> Double { result.atIndex(index)?.doubleValue ?? 0 }

        let artwork = string(8)
        return PlayerSnapshot(
            app: app,
            isPlaying: string(1) == "playing",
            trackID: "\(app.rawValue):\(string(2))",
            title: string(3),
            artist: string(4),
            album: string(5),
            duration: number(6),
            position: number(7),
            artworkURL: artwork.isEmpty ? nil : URL(string: artwork)
        )
    }

    func artwork(for snapshot: PlayerSnapshot) async -> NSImage? {
        if let url = snapshot.artworkURL {
            guard let data = try? await URLSession.shared.data(from: url).0 else { return nil }
            return NSImage(data: data)
        }
        guard snapshot.app == .music else { return nil }
        let script = musicArtworkScript ?? NSAppleScript(source: Self.musicArtworkSource)!
        musicArtworkScript = script
        var errorInfo: NSDictionary?
        let result = script.executeAndReturnError(&errorInfo)
        guard errorInfo == nil else { return nil }
        let data = result.data
        return data.isEmpty ? nil : NSImage(data: data)
    }
}
#endif
