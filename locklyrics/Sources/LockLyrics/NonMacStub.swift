// The app itself is macOS-only; this keeps `swift build` / `swift test`
// working on Linux so LyricsCore can be tested anywhere.
#if !canImport(AppKit)
@main
enum NonMacStub {
    static func main() {
        print("LockLyrics is a macOS app. Build it on a Mac with ./build-app.sh")
    }
}
#endif
