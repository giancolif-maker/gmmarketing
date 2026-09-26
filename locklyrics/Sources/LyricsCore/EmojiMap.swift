import Foundation

/// Maps common lyric words to an emoji for the "Visual" display style.
public enum EmojiMap {
    public static func emoji(for word: String) -> String? {
        let normalized = normalize(word)
        guard !normalized.isEmpty else { return nil }
        if let hit = table[normalized] { return hit }

        // Cheap stemming: hearts -> heart, kisses -> kiss, dancing -> dance/danc, cried -> cry.
        var candidates: [String] = []
        if normalized.hasSuffix("ies") { candidates.append(String(normalized.dropLast(3)) + "y") }
        if normalized.hasSuffix("ied") { candidates.append(String(normalized.dropLast(3)) + "y") }
        if normalized.hasSuffix("es") { candidates.append(String(normalized.dropLast(2))) }
        if normalized.hasSuffix("s") { candidates.append(String(normalized.dropLast())) }
        if normalized.hasSuffix("ing") {
            let stem = String(normalized.dropLast(3))
            candidates += [stem, stem + "e"]
            if let last = stem.last, stem.dropLast().last == last { candidates.append(String(stem.dropLast())) }
        }
        if normalized.hasSuffix("in") { candidates.append(String(normalized.dropLast(2))) }  // lovin' -> lov(e)
        if normalized.hasSuffix("ed") { candidates += [String(normalized.dropLast(2)), String(normalized.dropLast())] }
        if normalized.hasSuffix("er") { candidates.append(String(normalized.dropLast(2))) }

        for candidate in candidates where candidate.count >= 3 {
            if let hit = table[candidate] ?? table[candidate + "e"] { return hit }
        }
        return nil
    }

    static func normalize(_ word: String) -> String {
        var lower = word.lowercased()
            .replacingOccurrences(of: "’", with: "'")
            .trimmingCharacters(in: CharacterSet.letters.inverted)
        if lower.hasSuffix("'s") { lower.removeLast(2) }
        return lower.filter { $0.isLetter }
    }

    static let table: [String: String] = [
        // Love & feelings
        "love": "❤️", "heart": "❤️", "kiss": "💋", "hug": "🤗", "crush": "😍", "baby": "👶",
        "darling": "💕", "honey": "🍯", "sweet": "🍬", "sweetheart": "💕", "valentine": "💘",
        "broken": "💔", "heartbreak": "💔", "cry": "😢", "tear": "💧", "sad": "😢", "lonely": "🥀",
        "alone": "🥀", "smile": "😊", "happy": "😄", "laugh": "😂", "angry": "😠", "mad": "😠",
        "scared": "😨", "afraid": "😨", "fear": "😨", "crazy": "🤪", "cool": "😎", "shy": "🙈",
        "hope": "🤞", "pray": "🙏", "prayer": "🙏", "soul": "👻", "dream": "💭", "think": "💭",
        "sleep": "😴", "tired": "😴", "wake": "⏰", "kill": "🔪", "die": "💀", "dead": "💀",
        "death": "💀", "ghost": "👻", "devil": "😈", "hell": "🔥", "angel": "😇", "heaven": "☁️",
        "god": "🙏", "lord": "🙏", "jesus": "✝️", "sin": "😈", "evil": "😈", "wild": "🐺",
        "free": "🕊️", "freedom": "🕊️", "peace": "☮️", "war": "⚔️", "fight": "🥊", "win": "🏆",
        "lose": "📉", "lost": "🧭", "secret": "🤫", "lie": "🤥", "liar": "🤥", "truth": "💯",
        "real": "💯", "trust": "🤝", "friend": "🤝", "promise": "🤞", "forever": "♾️",
        "together": "👫", "wedding": "💒", "marry": "💍", "ring": "💍", "diamond": "💎",
        "diamonds": "💎", "gold": "🥇", "golden": "✨", "silver": "🥈",

        // Body
        "eye": "👀", "eyes": "👀", "look": "👀", "see": "👀", "watch": "👀", "stare": "👀",
        "hand": "✋", "hands": "🙌", "lips": "💋", "mouth": "👄", "tongue": "👅", "ear": "👂",
        "hear": "👂", "listen": "👂", "brain": "🧠", "mind": "🧠", "head": "🗣️", "face": "🙂",
        "blood": "🩸", "bone": "🦴", "bones": "🦴", "skin": "🤲", "feet": "🦶", "foot": "🦶",
        "leg": "🦵", "arm": "💪", "strong": "💪", "muscle": "💪", "body": "💃", "breathe": "🌬️",
        "breath": "🌬️", "nose": "👃", "tooth": "🦷", "teeth": "🦷", "hair": "💇", "nail": "💅",

        // Nature & weather
        "sun": "☀️", "sunshine": "☀️", "sunny": "☀️", "sunrise": "🌅", "sunset": "🌇",
        "moon": "🌙", "moonlight": "🌙", "star": "⭐", "stars": "✨", "sky": "🌌", "cloud": "☁️",
        "clouds": "☁️", "rain": "🌧️", "raining": "🌧️", "storm": "⛈️", "thunder": "⚡",
        "lightning": "⚡", "snow": "❄️", "cold": "🥶", "ice": "🧊", "frozen": "🧊", "winter": "❄️",
        "summer": "🏖️", "spring": "🌸", "autumn": "🍂", "fall": "🍂", "wind": "🌬️", "fire": "🔥",
        "burn": "🔥", "flame": "🔥", "hot": "🥵", "heat": "🥵", "smoke": "💨", "water": "💧",
        "ocean": "🌊", "sea": "🌊", "wave": "🌊", "waves": "🌊", "river": "🏞️", "lake": "🏞️",
        "beach": "🏖️", "sand": "🏖️", "island": "🏝️", "mountain": "⛰️", "hill": "⛰️",
        "tree": "🌳", "forest": "🌲", "flower": "🌸", "rose": "🌹", "roses": "🌹", "garden": "🌷",
        "leaf": "🍃", "grass": "🌱", "earth": "🌍", "world": "🌍", "planet": "🪐", "space": "🚀",
        "rainbow": "🌈", "light": "💡", "dark": "🌑", "darkness": "🌑", "shadow": "👤",
        "night": "🌃", "midnight": "🕛", "day": "🌞", "morning": "🌅", "tonight": "🌃",
        "sparkle": "✨", "shine": "✨", "shining": "✨", "glow": "✨", "bright": "✨",

        // Animals
        "dog": "🐕", "cat": "🐈", "bird": "🐦", "birds": "🐦", "fly": "🕊️", "wings": "🪽",
        "wing": "🪽", "butterfly": "🦋", "bee": "🐝", "snake": "🐍", "lion": "🦁", "tiger": "🐯",
        "wolf": "🐺", "bear": "🐻", "horse": "🐎", "fish": "🐟", "shark": "🦈", "monkey": "🐒",
        "pig": "🐖", "cow": "🐄", "chicken": "🐔", "spider": "🕷️", "dragon": "🐉", "unicorn": "🦄",
        "rabbit": "🐇", "bunny": "🐇", "fox": "🦊", "owl": "🦉", "eagle": "🦅", "dove": "🕊️",

        // Places & things
        "home": "🏠", "house": "🏠", "city": "🏙️", "town": "🏘️", "street": "🛣️", "road": "🛣️",
        "highway": "🛣️", "car": "🚗", "drive": "🚗", "ride": "🚗", "truck": "🛻", "train": "🚆",
        "plane": "✈️", "airplane": "✈️", "boat": "⛵", "ship": "🚢", "bike": "🚲", "rocket": "🚀",
        "door": "🚪", "window": "🪟", "bed": "🛏️", "room": "🛋️", "wall": "🧱", "bridge": "🌉",
        "church": "⛪", "school": "🏫", "hospital": "🏥", "prison": "⛓️", "jail": "⛓️",
        "chain": "⛓️", "chains": "⛓️", "key": "🔑", "lock": "🔒", "phone": "📱", "call": "📞",
        "text": "💬", "message": "💬", "letter": "✉️", "mail": "✉️", "book": "📖", "page": "📄",
        "picture": "🖼️", "photo": "📸", "camera": "📸", "mirror": "🪞", "clock": "⏰",
        "time": "⏳", "gun": "🔫", "knife": "🔪", "sword": "⚔️", "bomb": "💣", "crown": "👑",
        "king": "👑", "queen": "👑", "prince": "🤴", "princess": "👸", "throne": "👑",
        "money": "💰", "cash": "💵", "dollar": "💵", "dollars": "💵", "rich": "🤑", "bank": "🏦",
        "pay": "💸", "gift": "🎁", "present": "🎁", "balloon": "🎈", "party": "🎉",
        "celebrate": "🎉", "birthday": "🎂", "cake": "🎂", "candle": "🕯️", "ticket": "🎟️",
        "game": "🎮", "play": "▶️", "ball": "⚽", "dice": "🎲", "cards": "🃏", "magic": "🪄",
        "paper": "📄", "pen": "🖊️", "map": "🗺️", "flag": "🏳️", "bag": "👜", "shoes": "👟",
        "dress": "👗", "shirt": "👕", "jeans": "👖", "hat": "🎩", "glasses": "👓",

        // Food & drink
        "wine": "🍷", "beer": "🍺", "drink": "🍹", "drunk": "🥴", "whiskey": "🥃", "champagne": "🍾",
        "coffee": "☕", "tea": "🍵", "milk": "🥛", "bread": "🍞", "cherry": "🍒", "apple": "🍎",
        "peach": "🍑", "lemon": "🍋", "strawberry": "🍓", "candy": "🍭", "sugar": "🍬",
        "chocolate": "🍫", "pizza": "🍕", "burger": "🍔", "food": "🍽️", "eat": "🍽️",
        "hungry": "🍽️", "pill": "💊", "pills": "💊", "medicine": "💊", "cigarette": "🚬",

        // Music & motion
        "music": "🎵", "song": "🎶", "songs": "🎶", "sing": "🎤", "singing": "🎤", "radio": "📻",
        "guitar": "🎸", "drum": "🥁", "drums": "🥁", "piano": "🎹", "dance": "💃", "dancing": "💃",
        "rock": "🤘", "roll": "🎲", "beat": "🥁", "rhythm": "🎶", "melody": "🎶", "loud": "🔊",
        "quiet": "🤫", "silence": "🤫", "silent": "🤫", "run": "🏃", "running": "🏃", "walk": "🚶",
        "jump": "🦘", "swim": "🏊", "falling": "🍂", "high": "📈", "low": "📉", "up": "⬆️",
        "down": "⬇️", "away": "👋", "goodbye": "👋", "bye": "👋", "hello": "👋",
        "stop": "🛑", "go": "🟢", "fast": "⚡", "slow": "🐢", "speed": "🏎️", "crash": "💥",
        "boom": "💥", "explode": "💥", "shot": "🎯", "target": "🎯", "clap": "👏",

        // People
        "girl": "👧", "boy": "👦", "woman": "👩", "man": "👨", "mother": "👩", "mama": "👩",
        "mom": "👩", "father": "👨", "daddy": "👨", "dad": "👨", "papa": "👨", "family": "👪",
        "child": "🧒", "children": "🧒", "kid": "🧒", "kids": "🧒", "brother": "👬", "sister": "👭",
        "lover": "💑", "boyfriend": "💑", "girlfriend": "💑", "stranger": "🕵️", "hero": "🦸",
        "cowboy": "🤠", "robot": "🤖", "alien": "👽", "clown": "🤡",

        // Time
        "wait": "⏳", "waiting": "⏳", "minute": "🕐", "minutes": "🕐", "hour": "⌛", "hours": "⌛",
        "second": "⏱️", "seconds": "⏱️", "moment": "⏱️", "today": "📅", "tomorrow": "📅",
        "yesterday": "📅", "week": "📅", "year": "📅", "years": "📅", "late": "⏰", "early": "🌄",
        "always": "♾️", "again": "🔁", "back": "↩️", "last": "🔚", "first": "🥇", "end": "🔚",

        // Misc
        "yes": "✅", "no": "❌", "never": "🚫", "okay": "👌", "ok": "👌", "one": "1️⃣", "two": "2️⃣",
        "three": "3️⃣", "hundred": "💯", "million": "💰", "zero": "0️⃣", "number": "🔢",
        "question": "❓", "why": "❓", "wonder": "🤔", "idea": "💡", "gone": "💨", "ashes": "⚱️",
        "grave": "🪦", "cross": "✝️", "blue": "💙", "red": "❤️", "green": "💚",
        "yellow": "💛", "purple": "💜", "black": "🖤", "white": "🤍", "pink": "🩷", "orange": "🧡",
    ]
}
