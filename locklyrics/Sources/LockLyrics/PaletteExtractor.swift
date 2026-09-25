#if canImport(AppKit)
import AppKit

/// Derives a readable lyric palette from album artwork ("Auto Sync" colors).
enum PaletteExtractor {
    static func palette(from image: NSImage) -> Palette? {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }

        let side = 32
        var pixels = [UInt8](repeating: 0, count: side * side * 4)
        let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
            guard let context = CGContext(
                data: buffer.baseAddress, width: side, height: side, bitsPerComponent: 8,
                bytesPerRow: side * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
            ) else { return false }
            context.interpolationQuality = .medium
            context.draw(cgImage, in: CGRect(x: 0, y: 0, width: side, height: side))
            return true
        }
        guard drawn else { return nil }

        // Bucket pixels by hue, weighting vivid, reasonably bright pixels most.
        let bucketCount = 18
        var weights = [Double](repeating: 0, count: bucketCount)
        var sums = [(h: Double, s: Double, b: Double)](repeating: (0, 0, 0), count: bucketCount)
        var averageHue = (x: 0.0, y: 0.0)

        for i in stride(from: 0, to: pixels.count, by: 4) {
            let color = NSColor(
                srgbRed: CGFloat(pixels[i]) / 255, green: CGFloat(pixels[i + 1]) / 255,
                blue: CGFloat(pixels[i + 2]) / 255, alpha: 1
            )
            var h: CGFloat = 0, s: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            color.getHue(&h, saturation: &s, brightness: &b, alpha: &a)
            averageHue.x += cos(Double(h) * 2 * .pi) * Double(s)
            averageHue.y += sin(Double(h) * 2 * .pi) * Double(s)

            guard b > 0.25, s > 0.2 else { continue }
            let weight = Double(s * s) * Double(b)
            let bucket = min(Int(Double(h) * Double(bucketCount)), bucketCount - 1)
            weights[bucket] += weight
            sums[bucket].h += Double(h) * weight
            sums[bucket].s += Double(s) * weight
            sums[bucket].b += Double(b) * weight
        }

        let dominantHue = (atan2(averageHue.y, averageHue.x) / (2 * .pi) + 1).truncatingRemainder(dividingBy: 1)
        let tint = NSColor(hue: dominantHue, saturation: 0.10, brightness: 1.0, alpha: 1)
        let secondary = NSColor(hue: dominantHue, saturation: 0.18, brightness: 0.82, alpha: 1)

        guard let best = weights.indices.max(by: { weights[$0] < weights[$1] }), weights[best] > 2 else {
            // Mostly grayscale artwork: soft white lyrics with a warm highlight.
            return Palette(lyric: tint, highlight: NSColor(hue: 0.13, saturation: 0.55, brightness: 1, alpha: 1), secondary: secondary)
        }

        let w = weights[best]
        let highlight = NSColor(
            hue: sums[best].h / w,
            saturation: max(sums[best].s / w, 0.55),
            brightness: max(sums[best].b / w, 0.92),
            alpha: 1
        )
        return Palette(lyric: tint, highlight: highlight, secondary: secondary)
    }
}
#endif
