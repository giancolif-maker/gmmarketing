// Act 3 (frames 34–43) and Act 4 (frames 44–55) cue sheets. Format: see cues.mjs / cues-act2.mjs.
const N = (text, x = {}) => ({ who: "NARRATOR", text, ...x });
export const VOICES_A34 = {
  SAILOR: ["am_puck", 1.25], ARCHIMEDES: ["bm_lewis", 1.1, "en-gb"], MOTHER: ["af_bella", 1.08],
  MASINISSA: ["am_fenrir", 1.0], CATO: ["bm_daniel", 1.05, "en-gb"],
};
export const META_A34 = { "34": { lead: 3.4, intro: "act" }, "44": { lead: 3.4, intro: "act" } };
export const FRAMES_A34 = {
  // ---------------- ACT 3 ----------------
  "34": [
    N("After Cannae, any normal country would have asked for peace. Hannibal was counting on it."),
    { who: "HANNIBAL", text: "So. Shall we talk terms?", add: [200, 400, 440, "bl", 40], el: "hannibal" },
    { who: "FLACCUS", text: "No.", add: [1460, 420, 200, "br", 64], el: "flaccus" },
    { who: "HANNIBAL", text: "You lost eighty thousand men.", add: [160, 400, 480, "bl", 40], el: "hannibal" },
    { who: "FLACCUS", text: "Okay. More legions.", add: [1280, 420, 400, "br", 42], el: "flaccus", keep: true },
  ],
  "35": [
    N("Rome refused to even discuss peace.", { at: ["st-a"] }),
    N("Refused to ransom its own prisoners.", { at: ["st-b"] }),
    N("Limited public mourning to thirty days.", { at: ["st-c"] }),
    N("Bought eight thousand slaves, armed them, and sent them to fight. Rome refused to lose.", { at: ["st-d@0.3"] }),
  ],
  "36": [
    N("Some allies did switch to Hannibal — including big, rich Capua.", { at: ["capua@0.6"], sfx: [["ding", 1.2]] }),
    N("King Philip the Fifth of Macedon signed up.", { at: ["r-mac@0.3", "macedon@0.3"] }),
    N("Syracuse in Sicily switched too, defended by Archimedes, who built giant cranes that grabbed Roman ships and flipped them over.", { at: ["syracuse@0.1", "st-team@0.35"] }),
  ],
  "37": [
    { who: "SAILOR", text: "Is this normal?!", add: [420, 600, 360, "bl", 44], el: "sailor", move: [["claw", 0.0, { dr: -4 }, 0.6]], sfx: [["boing", 0.2]] },
    N("Rome besieged Syracuse for two years anyway, took it, and in the chaos, a Roman soldier killed Archimedes. Possibly while he was doing maths.", { at: ["circles@0.45"] }),
    { who: "ARCHIMEDES", text: "Don't disturb my circles!", add: [180, 420, 460, "bl", 42], el: "arch2", keep: true },
  ],
  "38": [
    N("Meanwhile, Hannibal had a problem. He couldn't take big walled cities. He had no siege engines, and not enough men. He wrote home for reinforcements."),
    { who: "HANNIBAL", text: "Dear Carthage. Winning. Need more men. Love, Hannibal.", el: "hannibal", at: ["letter-1"] },
    { who: "HANNO", text: "No.", add: [1500, 360, 200, "bl", 64], el: "hanno" },
    { who: "HANNIBAL", text: "Dear Carthage. Still winning. Really need more men.", el: "hannibal", at: ["letter-2"] },
    { who: "HANNO", text: "No.", add: [1520, 380, 200, "bl", 64], el: "hanno" },
    { who: "HANNIBAL", text: "Dear Carthage. Please.", el: "hannibal", at: ["letter-3"] },
    { who: "HANNO", text: "…No.", add: [1500, 360, 220, "bl", 64], el: "hanno", keep: true, sfx: [["slam", 0.1]] },
  ],
  "39": [
    N("So Rome went back to Fabius' plan. Never fight Hannibal. Fight everyone around Hannibal. In 211, Rome besieged Capua. To pull them off it, Hannibal marched on Rome itself and camped three miles outside the walls.", { at: ["camp@0.75", "hannibal@0.75"] }),
    { who: "MOTHER", text: "Eat your vegetables or Hannibal will get you.", add: [880, 120, 520, "br", 38], el: "mother", at: ["mother", "kid"] },
    N("For centuries, \"Hannibal ad portas\" — \"Hannibal's at the gates\" — was what Roman parents said to scare their kids. But Rome didn't move a single legion from Capua. Instead, Livy says, they auctioned off the land Hannibal was camping on. And it sold. At full price.", { at: ["st-portas@0.1", "sale@0.85"] }),
    { who: "HANNIBAL", text: "They're selling my tent?", add: [560, 520, 440, "bl", 40], el: "hannibal" },
    N("Hannibal left. Capua fell.", { move: [["hannibal", 0.2, { dx: -900 }, 1.6]] }),
  ],
  "40": [
    N("In Spain, though, Rome was losing. Both Scipio brothers — including our consul from the Rhône — were killed in 211.", { at: ["graves@0.3"] }),
    N("Rome needed a new commander in Spain. Nobody wanted the job. Except one twenty-five-year-old.", { at: ["senators", "flaccus"] }),
    { who: "PUBLIUS", text: "I'll do it!", add: [260, 300, 280, "bl", 50], el: "publius", at: ["publius"] },
    { who: "FLACCUS", text: "Who are you?", add: [1300, 380, 330, "br", 42], el: "flaccus" },
    { who: "PUBLIUS", text: "The kid from the Ticinus! Remember?", el: "publius", at: ["ptr@0.5"], keep: true, sfx: [["ding", 1.0]] },
  ],
  "41": [
    N("Publius Cornelius Scipio studied Hannibal like homework. In 209, he marched on New Carthage, Carthage's capital in Spain, learned from fishermen that the lagoon behind it got shallow in the evening, and sent men wading across while everyone was defending the front wall.", { at: ["front@0.5", "waders@0.7"], move: [["waders", 0.75, { dx: -560, dy: 100 }, 3.0]] }),
    N("He took the city in a day.", { at: ["st-day"] }),
    { who: "PUBLIUS", text: "I copied his homework.", add: [1240, 600, 420, "br", 40], el: "publius", keep: true },
  ],
  "42": [
    N("Meanwhile, Hannibal's younger brother Hasdrubal escaped Spain with an army, and crossed the Alps too. It went much better this time.", { at: ["route2"] }),
    N("But the Romans captured his messengers, and at the Metaurus River two consuls ganged up on him. Hasdrubal was killed.", { at: ["msg@0.2", "metaurus@0.7"], sfx: [["stab", 0.25]] }),
    N("The Romans threw his head into Hannibal's camp."),
    N("That's how Hannibal found out.", { at: ["sad"] }),
  ],
  "43": [
    N("In 206, Scipio crushed the last big Carthaginian army in Spain at Ilipa. Spain was Rome's.", { at: ["st-ilipa", "r-spain-r@0.75"] }),
    N("And Hannibal — still undefeated in Italy — was stuck in the toe of the boot.", { at: ["toe@0.6"] }),
    { who: "SURUS", text: "Are we there yet?", add: [1260, 560, 380, "br", 42], el: "surus" },
    { who: "HANNIBAL", text: "…No.", add: [1000, 640, 200, "br", 52], el: "hannibal", keep: true },
  ],
  // ---------------- ACT 4 ----------------
  "44": [
    N("Scipio came home a hero, became consul, and had an idea."),
    { who: "PUBLIUS", text: "Hannibal came to us. So let's go to them.", add: [140, 420, 520, "bl", 40], el: "publius", at: ["africa-map"] },
    { who: "FABIUS", text: "That's reckless.", add: [1300, 440, 360, "br", 42], el: "fabius" },
    { who: "PUBLIUS", text: "That's the point.", add: [180, 440, 380, "bl", 42], el: "publius", keep: true },
  ],
  "45": [
    N("The senate gave him Sicily and permission, but barely any army, so he raised volunteers — including survivors of Cannae who'd been sent to Sicily in disgrace — and in 204 BC, landed in Africa.", { at: ["st-cannae@0.35", "ships@0.8"], sfx: [["whoosh", 9.0]] }),
  ],
  "46": [
    N("He found an ally: Masinissa, a Numidian prince with the best cavalry in the world and a grudge against Carthage's ally Syphax.", { at: ["masinissa", "cav@0.4", "st-mas@0.5"], sfx: [["gallop", 1.0]] }),
    { who: "MASINISSA", text: "I hate Syphax.", add: [1180, 460, 340, "br", 44], el: "masinissa" },
    { who: "PUBLIUS", text: "I can work with that.", add: [300, 440, 420, "bl", 42], el: "publius", keep: true },
  ],
  "47": [
    N("Scipio burned Syphax's camps in a night attack, beat Carthage in the field, and suddenly Carthage was very, very worried.", { at: ["flames@0.2", "panic@0.82"], sfx: [["boom", 0.8]] }),
    { who: "HANNO", text: "Bring Hannibal home!", add: [420, 360, 420, "bl", 44] },
    { who: "GISGO", text: "Oh, NOW we're sending boats.", add: [1180, 380, 500, "br", 40], el: "gisgo2", keep: true },
  ],
  "48": [
    N("So, after fifteen years in Italy — fifteen years, never once beaten in a major battle — Hannibal sailed home.", { at: ["st-15@0.4"], move: [["boat", 0.3, { dx: 260 }, 5.0]] }),
    { who: "SURUS", text: "The beach!", add: [1200, 360, 300, "bl", 50], el: "surus", keep: true },
  ],
  "49": [
    N("In 202 BC, near Zama, the two greatest generals of their age actually met face to face before the battle. Hannibal, older, with one eye, offered peace.", { at: ["st-zama", "armies"] }),
    { who: "HANNIBAL", text: "You're young. You've been lucky. Luck runs out.", add: [160, 420, 520, "bl", 38], el: "hannibal" },
    { who: "PUBLIUS", text: "I've been reading your stuff.", add: [1220, 420, 480, "br", 40], el: "publius" },
    { who: "HANNIBAL", text: "…Oh no.", add: [300, 460, 260, "bl", 48], el: "hannibal", keep: true, sfx: [["sting", 0.3]] },
  ],
  "50": [
    N("Hannibal had eighty fresh elephants.", { at: ["herd"], count: [["el-counter", 0.2, 1, 81]], sfx: [["rumble", 0.3]] }),
    N("Scipio had studied him for years. He lined his men up with lanes between the units.", { at: ["lanes@0.6"] }),
    N("When the elephants charged, the Romans blew every horn and trumpet they had. The elephants panicked.", { at: ["horns@0.55"], move: [["herd", 0.15, { dy: 320 }, 2.2]], sfx: [["sting", 2.6]] }),
    N("Many ran straight down the lanes and out the back. Some turned around and trampled Carthage's own cavalry.", { move: [["herd", 0.1, { dy: 900, o: 0 }, 2.6]], count: [["el-counter", 0.6, 81, 1]] }),
    { who: "SURUS", text: "Amateurs.", add: [1440, 380, 300, "br", 48], el: "surus", keep: true, at: ["surus"] },
  ],
  "51": [
    N("The infantry fought for hours. Then Masinissa and Laelius came back with the cavalry and smashed into Hannibal's rear.", { at: ["c-inf", "r-inf", "cav-a@0.6", "cav-b@0.6"], move: [["cav-a", 0.75, { dx: 560, dy: -560 }, 1.4], ["cav-b", 0.75, { dx: -560, dy: -560 }, 1.4]], sfx: [["crash", 6.0]] }),
    N("Surround the enemy. Hit them from behind. That was Cannae. Scipio beat Hannibal with Hannibal's own move."),
    { who: "PUBLIUS", text: "Copied your homework.", add: [440, 160, 420, "bl", 42], el: "pip-p", at: ["pip-p"] },
    { who: "HANNIBAL", text: "You got a better grade.", add: [1060, 160, 440, "br", 42], el: "pip-h", at: ["pip-h"], keep: true },
  ],
  "52": [
    N("Rome named him Scipio Africanus. Carthage surrendered in 201 BC.", { at: ["st-af"] }),
    N("It lost Spain.", { at: ["st-a"] }),
    N("Gave up its navy except ten ships.", { at: ["st-b"] }),
    N("Agreed to pay ten thousand talents over fifty years.", { at: ["st-c"] }),
    N("And promised never to start a war — ever again — without Rome's permission.", { at: ["st-d"] }),
    { who: "HANNO", text: "Can we at least—", add: [240, 560, 380, "bl", 40], el: "hanno" },
    { who: "FLACCUS", text: "No.", add: [1460, 580, 200, "br", 64], el: "flaccus" },
    { who: "HANNO", text: "…Huh. So that's what that feels like.", add: [180, 560, 520, "bl", 38], el: "hanno", keep: true },
  ],
  "53": [
    N("And Hannibal? He went back to Carthage, got elected to high office, fought corruption, and fixed the finances so well that Carthage offered to pay off the fifty-year debt early.", { at: ["coins@0.6", "st-paid@0.8"], sfx: [["ding", 8.0]] }),
    { who: "FLACCUS", text: "…That's suspicious.", b: "flaccus-pip" },
    N("Rome pressured him into exile. For years he advised Rome's enemies, from Syria to Bithynia, and in 183 BC, with Roman agents closing in, he took poison rather than be handed over. Scipio Africanus died around the same time, in self-imposed exile, bitter at the Romans he'd saved.", { at: ["exile@0.05"] }),
  ],
  "54": [
    N("As for Carthage: an old senator named Cato started ending every speech — about anything — with the same words.", { at: ["cato", "audience"] }),
    { who: "CATO", text: "…and that concludes my thoughts on the price of figs. Also, Carthage must be destroyed.", el: "cato", at: ["figs@0.1", "st-delenda@0.75"] },
    N("Fifty years later, it was. But that's another war.", { at: ["st-146@0.4"] }),
  ],
  "55": [
    N("Hannibal won almost every battle. Rome won the war. Because Rome never, ever quit. And because one kid did his homework.", { at: ["board"] }),
    { who: "SURUS", text: "Are we there yet?", add: [1280, 520, 380, "br", 42], el: "surus" },
    N("Yes, Surus. We're there.", { at: ["end@0.6"], sfx: [["sting", 1.4]] }),
  ],
};
