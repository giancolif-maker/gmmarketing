#if canImport(AppKit)
import AppKit
import ServiceManagement
import SwiftUI

struct SettingsView: View {
    @ObservedObject var settings: Settings
    let onPreview: () -> Void

    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled

    var body: some View {
        Form {
            Section("Display") {
                Picker("Style", selection: $settings.style) {
                    ForEach(LyricStyle.allCases) { Text($0.title).tag($0) }
                }
                Picker("Show", selection: $settings.displayMode) {
                    ForEach(DisplayMode.allCases) { Text($0.title).tag($0) }
                }
                LabeledContent("Text size") {
                    Slider(value: $settings.textScale, in: 0.5...1.6)
                }
                LabeledContent("Background darkness") {
                    Slider(value: $settings.backgroundOpacity, in: 0...1)
                }
                LabeledContent("Vertical position") {
                    Slider(value: $settings.verticalPosition, in: 0.2...0.9)
                }
                Toggle("Emoji beside words (Fisheye)", isOn: $settings.showEmoji)
                Toggle("Keep display awake while playing on the lock screen", isOn: $settings.keepDisplayAwake)
            }

            Section("Colors") {
                Picker("Colorway", selection: colorwayBinding) {
                    ForEach(Colorway.all) { Text($0.name).tag($0.name) }
                    Text("Custom").tag("")
                }
                Toggle("Auto Sync colors from album artwork", isOn: $settings.autoColors)
                ColorPicker("Background", selection: color(\.backgroundHex), supportsOpacity: false)
                Group {
                    ColorPicker("Lyric", selection: color(\.lyricHex), supportsOpacity: false)
                    ColorPicker("Highlight", selection: color(\.highlightHex), supportsOpacity: false)
                    ColorPicker("Secondary text", selection: color(\.secondaryHex), supportsOpacity: false)
                }
                .disabled(settings.autoColors)
            }

            Section("Timing") {
                Stepper(value: $settings.offset, in: -5...5, step: 0.1) {
                    Text("Lyrics offset: \(settings.offset, specifier: "%+.1f") s")
                }
                Text("Raise it if lyrics lag behind the singer, lower it if they run ahead.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section {
                Toggle("Launch at login", isOn: $launchAtLogin)
                    .onChange(of: launchAtLogin) { _, enabled in
                        do {
                            if enabled { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
                        } catch {
                            launchAtLogin = SMAppService.mainApp.status == .enabled
                        }
                    }
                Button("Preview on desktop (10 s)", action: onPreview)
            }
        }
        .formStyle(.grouped)
        .frame(width: 460)
        .fixedSize(horizontal: false, vertical: true)
    }

    private var colorwayBinding: Binding<String> {
        Binding(
            get: { settings.autoColors ? "" : settings.colorway?.name ?? "" },
            set: { name in
                if let colorway = Colorway.all.first(where: { $0.name == name }) { settings.apply(colorway) }
            }
        )
    }

    private func color(_ keyPath: ReferenceWritableKeyPath<Settings, String>) -> Binding<Color> {
        Binding(
            get: { Color(nsColor: NSColor(hex: settings[keyPath: keyPath]) ?? .white) },
            set: { settings[keyPath: keyPath] = NSColor($0).hexString }
        )
    }
}
#endif
