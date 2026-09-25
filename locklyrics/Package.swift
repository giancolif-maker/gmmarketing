// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LockLyrics",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "LockLyrics", targets: ["LockLyrics"]),
    ],
    targets: [
        // Platform-independent logic: LRC parsing, word timing, LRCLIB client, emoji map.
        .target(name: "LyricsCore"),
        // macOS menu bar app (AppKit + SwiftUI).
        .executableTarget(name: "LockLyrics", dependencies: ["LyricsCore"]),
        .testTarget(name: "LyricsCoreTests", dependencies: ["LyricsCore"]),
    ]
)
