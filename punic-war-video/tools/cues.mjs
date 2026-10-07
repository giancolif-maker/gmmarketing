import { FRAMES_A34, META_A34, VOICES_A34 } from "./cues-act34.mjs";
import { FRAMES_A2, META_A2, VOICES_A2 } from "./cues-act2.mjs";
// Act 1 cue sheet: every spoken line, who says it, and what it triggers on screen.
// line: { who, text, b?: existing bubble id, add?: [x, y, w, tail, size] new bubble,
//         el?: speaker element id (bobs while talking), keep?: true, at?: [ids revealed at line start],
//         sfx?: [[name, offsetSec]] }
// Bubble text defaults to the spoken text. Ids are local to the frame (builder prefixes them).
export const VOICES = {
  NARRATOR: ["bm_george", 1.2, "en-gb"], HANNIBAL: ["am_onyx", 1.04], KID: ["af_sky", 1.16],
  HAMILCAR: ["am_fenrir", 1.1], GISGO: ["am_puck", 1.19], SURUS: ["am_santa", 0.95],
  HANNO: ["bm_lewis", 0.99, "en-gb"], FLACCUS: ["bm_fable", 1.1, "en-gb"], SCIPIO: ["am_michael", 1.16],
  PUBLIUS: ["am_echo", 1.16], ENVOY: ["bm_daniel", 1.04, "en-gb"], SAGUNTINE: ["am_liam", 1.21],
  CARTH: ["am_eric", 1.1], HASDRUBAL: ["am_adam", 1.01], SPY: ["am_eric", 1.26], TRIBESMAN: ["am_liam", 1.1],
  MAGO: ["am_puck", 1.19], DENNIS: ["bm_lewis", 1.0, "en-gb"],
};
const N = (text, x = {}) => ({ who: "NARRATOR", text, ...x });

export const META = { "02": { drop: ["st-fornow"] } };

export const FRAMES = {
  "01": [
    N("This is Hannibal Barca! He marched elephants over the Alps, beat Rome in battle after battle after battle, and won a victory so perfect that generals are STILL copying it, two thousand years later!", { at: ["board"] }),
    N("He lost.", { at: ["box-5", "st-lost"], sfx: [["slam", 0]] }),
    { who: "HANNIBAL", text: "I'd like to see the replay.", b: "b-replay", el: "surus" },
    N("Later. This is the Second Punic War!", { at: ["title@0.3"], sfx: [["sting", 0.3]] }),
  ],
  "02": [
    N("On one side: Rome! Hobbies: roads, laws, and owning things that aren't Rome yet.", { at: ["r-rome", "flaccus"] }),
    N("On the other: Carthage! Rich, North African, best navy on Earth.", { at: ["r-carth", "carth"] }),
    { who: "FLACCUS", text: "Nice island.", b: "b1", el: "flaccus", at: ["sicily-ring"] },
    { who: "CARTH", text: "Thank you. It's ours.", b: "b2", el: "carth" },
    { who: "FLACCUS", text: "Is it, though?", add: [1300, 600, 380, "bl", 44], el: "flaccus", keep: true, sfx: [["sting", 0.2]] },
  ],
  "03": [
    N("They'd already had one war over that island. Rome didn't have a navy, so Rome found a wrecked Carthaginian ship and copied it. Plank. By. Plank.", { at: ["copy@0.55", "tape@0.55", "st-plank@0.86"] }),
    { who: "CARTH", text: "That's literally my boat.", b: "offscreen" },
    N("Then Rome lost four entire fleets. Not to Carthage. To the weather.", { at: ["storm"], sfx: [["thunder", 0.4]] }),
    { who: "FLACCUS", text: "Okay. More ships.", add: [1300, 560, 420, "br", 40], el: "copier" },
    N("And Rome won anyway, mostly by refusing to stop. Remember that. It's the whole video.", { at: ["st-win"] }),
  ],
  "04": [
    N("Then Carthage's own mercenaries attacked Carthage, over pay.", { at: ["mercs"] }),
    N("And while Carthage was busy, Rome quietly picked up Sardinia. And Corsica.", { at: ["hand@0.3", "islands@0.3"], sfx: [["whoosh", 0.8]] }),
    { who: "CARTH", text: "Excuse me, those are—", add: [120, 560, 460, "br", 40] },
    { who: "FLACCUS", text: "Ours now. Finders keepers.", add: [1330, 70, 470, "bl", 40], el: "flaccus" },
    { who: "CARTH", text: "We didn't lose them, you TOOK them!", add: [120, 700, 520, "br", 38] },
    { who: "FLACCUS", text: "Hm. That sounds like a complaint.", add: [1380, 520, 480, "bl", 36], el: "flaccus" },
    N("Rome then charged Carthage twelve hundred more talents. For complaining. That really happened.", { at: ["invoice"], sfx: [["slam", 1.0]] }),
  ],
  "05": [
    N("Nobody took it worse than Hamilcar Barca! His surname meant \"lightning.\" His personality also meant lightning.", { at: ["board", "strings"] }),
    { who: "HAMILCAR", text: "It's all connected. The islands. The fee. My knee. ROME.", add: [80, 60, 520, "br", 36], el: "hamilcar" },
    { who: "HANNO", text: "Your knee is not Rome.", add: [1380, 340, 420, "bl", 38], el: "hanno-win", at: ["hanno-win"] },
    { who: "HAMILCAR", text: "Then explain why it hurts when I think about Rome!", add: [80, 60, 560, "br", 34], el: "hamilcar" },
    N("He asked the senate to send him to Spain, to \"make money.\""),
    { who: "HANNO", text: "Is this a revenge thing?", add: [1380, 340, 440, "bl", 38], el: "hanno-win" },
    { who: "HAMILCAR", text: "It's a money thing. With revenge… as a side dish.", b: "b-fin", el: "hamilcar" },
    { who: "HANNO", text: "No.", b: "b-no", el: "hanno-win", keep: true },
    N("He went anyway.", { stk: [960, 900, "HE WENT ANYWAY.", 54, -3] }),
  ],
  "06": [
    { who: "HAMILCAR", text: "Hannibal! Want to come on a trip with Daddy?", add: [240, 240, 560, "br", 38], el: "hamilcar", at: ["flame"] },
    { who: "KID", text: "Yes!", add: [1200, 360, 220, "bl", 56], el: "kid" },
    { who: "HAMILCAR", text: "Great. Swear eternal hatred of Rome.", add: [200, 220, 560, "br", 38], el: "hamilcar" },
    { who: "KID", text: "…Do I get a snack after?", b: "b-version", el: "kid" },
    { who: "HAMILCAR", text: "You get hatred. Forever.", add: [200, 230, 500, "br", 40], el: "hamilcar" },
    { who: "KID", text: "…Okay.", add: [1220, 380, 260, "bl", 46], el: "kid" },
    N("The ancient historians say this really happened! Most kids his age got a pet.", { at: ["split"], sfx: [["whoosh", 0]] }),
    N("Hannibal got a grudge. And honestly? He took better care of it than most people take of a pet.", { at: ["split-r"] }),
  ],
  "07": [
    N("In Spain, Hamilcar built a whole new empire! Silver mines. Tough soldiers. Elephants.", { at: ["r-spain", "coins"], sfx: [["ding", 1.2]] }),
    { who: "SPY", text: "Carthage: rich again. Spain: theirs. Elephants: yes. My beard: convincing.", b: "b-spy", el: "spy", at: ["bush", "spy"] },
    N("Then, while retreating across a river… Hamilcar drowned.", { at: ["river"], sfx: [["splash", 1.6]] }),
    { who: "HAMILCAR", text: "Boys! Hate Rome! Feed the elephants! And don't—", add: [520, 180, 640, "bl", 40], sfx: [["splash", 2.6]] },
    N("Historians have spent two thousand years wondering what \"don't\" was.", { stk: [960, 920, "DON'T WHAT?!", 56, 3] }),
  ],
  "08": [
    N("Next in charge: his son-in-law, Hasdrubal! Known to history as… Hasdrubal the Handsome. Not \"the Brave.\" Not \"the Wise.\" Just. Handsome.", { at: ["hasdrubal", "st-name@0.35", "sparkles"], sfx: [["ding", 0.6]] }),
    { who: "HASDRUBAL", text: "It's a burden.", add: [1180, 300, 340, "bl", 44], el: "hasdrubal" },
    N("He signed a deal with Rome: Carthage stays south of the River Ebro.", { at: ["ebro", "ebro-label", "flaccus"] }),
    { who: "FLACCUS", text: "Not one toe over this line.", b: "b-toe", el: "flaccus" },
    { who: "HASDRUBAL", text: "Have you SEEN my toes? I'd never risk them.", b: "b-darling", el: "hasdrubal" },
    N("Then a servant with a grudge assassinated him. Hasdrubal the Handsome became Hasdrubal the… Late. That family had a lot of grudges.", { at: ["dagger"], sfx: [["stab", 0.9]] }),
  ],
  "09": [
    N("So in 221 BC, the army picked a new boss. Hannibal! Twenty-six years old! The kid from the altar.", { at: ["lift"], sfx: [["cheer", 0.2]] }),
    N("Still holding the grudge.", { at: ["flash", "st-angry"], sfx: [["slam", 0]] }),
    N("His soldiers adored him. He ate what they ate, and slept on the ground in his cloak, next to the guards."),
    { who: "MAGO", text: "He sleeps on the GROUND. I have a pillow. Now I feel like a monster.", add: [1150, 640, 560, "br", 34] },
    N("This is Mago, his little brother. Mago worries. Mago is always right. Nobody ever listens to Mago.", { stk: [1380, 960, "MAGO: ALWAYS RIGHT, NEVER LISTENED TO", 34, -2] }),
  ],
  "10": [
    N("South of the Ebro sat a little town called Saguntum. Saguntum had a best friend.", { at: ["town"] }),
    { who: "SAGUNTINE", text: "We're friends with Rome! Rome's got our back!", add: [1120, 560, 520, "br", 38], el: "saguntine-happy" },
    N("Hannibal attacked it anyway.", { at: ["fires", "smoke", "saguntine"], sfx: [["boom", 0.2]] }),
    N("The siege lasted eight months. And Rome, their best friend in the whole world, sent…", { at: ["calendar", "letter"] }),
    { who: "SAGUNTINE", text: "\"Thinking of you! — Rome.\"", el: "saguntine" },
    N("When Saguntum fell, many of its people chose to die rather than surrender. Rome had promised to protect them. Rome had been busy."),
  ],
  "11": [
    N("So Rome sent envoys to Carthage, demanding Hannibal be handed over. And the lead envoy did the most dramatic thing a man in a bedsheet has ever done.", { at: ["senate", "envoy"] }),
    { who: "ENVOY", text: "In this fold of my toga, I hold peace — and war! Choose!", add: [1120, 260, 600, "bl", 38], el: "envoy", at: ["fold"] },
    { who: "HANNO", text: "Which side is which?", b: "b-what", el: "hanno" },
    { who: "ENVOY", text: "It doesn't— it's metaphorical. CHOOSE!", b: "b-snacks", el: "envoy" },
    { who: "HANNO", text: "You choose.", add: [380, 300, 300, "bl", 42], el: "hanno" },
    { who: "ENVOY", text: "Fine! I let fall… WAR!", add: [1120, 300, 460, "bl", 44], el: "envoy" },
    { who: "HANNO", text: "…You dropped a sandwich.", add: [360, 300, 440, "bl", 38], el: "hanno", keep: true },
    N("The toga part is real. The sandwich is just very likely. The Second Punic War had begun! 218 BC.", { at: ["st-war@0.55"], sfx: [["slam", 0]] }),
  ],
  "12": [
    N("Rome owned the sea, so Rome's plan was simple: one army sails to Spain, one army sails to Africa. Done.", { at: ["sea-plans"] }),
    { who: "FLACCUS", text: "Where's he going to go? He can't sail. He can't fly.", add: [1180, 70, 640, "bl", 36], at: ["flaccus-pip"] },
    N("Nobody had ever marched an army over the Alps, in autumn, with elephants. Because that's insane. So, naturally…", { at: ["hannibal", "gisgo"] }),
    { who: "HANNIBAL", text: "We walk.", add: [1100, 640, 260, "br", 48], el: "hannibal", at: ["route", "x1", "x2"], sfx: [["whoosh", 0]] },
    { who: "MAGO", text: "Walk. To Italy. Through those?", b: "b-mtn", el: "gisgo" },
    { who: "HANNIBAL", text: "Mm-hm.", add: [1150, 720, 200, "br", 46], el: "hannibal" },
    { who: "MAGO", text: "They're called the Alps. People die there for fun.", add: [1440, 600, 440, "br", 38], el: "gisgo" },
    { who: "HANNIBAL", text: "Then it will be fun.", b: "b-fine", el: "hannibal" },
    { who: "MAGO", text: "That's not what I— okay.", add: [1460, 600, 400, "br", 40], el: "gisgo", keep: true },
    N("It would not be fun.", { at: ["st-notfine"], sfx: [["scratch", 0]] }),
  ],
  "13": [
    N("Hannibal marched out with ninety thousand infantry! Twelve thousand cavalry! And thirty-seven elephants!", { at: ["army", "cnt-0@0.15", "cnt-1@0.45", "cnt-2@0.75"] }),
    N("This is Surus. Surus is the biggest one. Surus thinks this is a holiday.", { at: ["surus", "surus-label"], sfx: [["boing", 0.4]] }),
    { who: "SURUS", text: "Is there a beach?", b: "b-beach", el: "surus" },
    { who: "HANNIBAL", text: "There's… a coast. Eventually.", b: "b-sort", el: "hannibal", at: ["hannibal", "el-counter"] },
    { who: "SURUS", text: "I'll pack my towel.", add: [760, 560, 360, "bl", 42], el: "surus", keep: true },
  ],
  "14": [
    N("First up: the Pyrenees! Hostile tribes the whole way. Thousands of his men decided they'd rather go home. So Hannibal just… let them.", { at: ["deserters"] }),
    { who: "MAGO", text: "Hold on. We were ALLOWED to go home?", add: [1160, 340, 560, "br", 36], el: "gisgo" },
    { who: "HANNIBAL", text: "Yes.", add: [700, 420, 180, "bl", 48], el: "hannibal" },
    { who: "MAGO", text: "Great, I'll just—", add: [1200, 420, 340, "br", 42], el: "gisgo" },
    { who: "HANNIBAL", text: "Not you.", b: "b-notyou", el: "hannibal", keep: true },
  ],
  "15": [
    N("Next: the river Rhône. Elephants hate deep water, so the engineers built enormous rafts and covered them in dirt, to trick the elephants into thinking it was land.", { at: ["raft"] }),
    { who: "SURUS", text: "Ground. Good ground.", add: [300, 340, 400, "br", 44], el: "surus" },
    { who: "SURUS", text: "Why is the ground leaving?", b: "b-moving", el: "surus" },
    N("Some panicked and jumped in, and discovered elephants can swim, using their trunks as snorkels! Surus considered this the beach.", { at: ["snorkel", "st-swim"], sfx: [["splash", 0.3]] }),
    { who: "SURUS", text: "Five stars.", add: [1240, 320, 300, "br", 48], keep: true },
  ],
  "16": [
    N("Meanwhile, the Roman consul Publius Scipio was racing to the Rhône to stop him!", { at: ["ship"] }),
    { who: "SCIPIO", text: "Hannibal! In the name of the Senate and People of— oh.", add: [240, 240, 600, "br", 38], el: "scipio", at: ["scipio"] },
    N("He was three days late.", { at: ["st-late", "tumbleweed"], sfx: [["wind", 0]] }),
    { who: "SCIPIO", text: "Still warm. We're close.", b: "b-warm", el: "scipio", at: ["dung"] },
    N("He was not close. He then sailed to Spain anyway, which turned out to matter a lot. Remember him."),
  ],
  "17": [
    N("And then: the Alps. In autumn. With elephants.", { at: ["peaks"], sfx: [["wind", 0]] }),
    N("Snow, ice, landslides, paths one foot wide over a two thousand foot drop. Most of his men had never even SEEN snow. They hated it immediately.", { at: ["column", "surus", "mule"] }),
    { who: "MAGO", text: "Brother, I can't feel my face.", add: [220, 470, 440, "br", 40], el: "gisgo", at: ["gisgo", "hannibal"] },
    { who: "HANNIBAL", text: "Then it can't hurt.", add: [1140, 520, 400, "bl", 40], el: "hannibal" },
    { who: "MAGO", text: "That's— that's not how faces work.", b: "b-warm", el: "gisgo", keep: true },
  ],
  "18": [
    N("The local tribes did not love a giant army marching through their living room. So they rolled boulders on it.", { at: ["gauls", "rocks"], sfx: [["rumble", 1.5]] }),
    { who: "TRIBESMAN", text: "Strike! …Spare. …Strike! Ooh, an elephant, that's double points.", b: "score", el: "gauls", keep: true, sfx: [["crash", 0]] },
    { who: "SURUS", text: "I am not a pin!", add: [1260, 560, 340, "br", 44], keep: true },
    N("Hannibal fought through. But he lost a lot of men on those cliffs.", { at: ["aah"] }),
  ],
  "19": [
    N("Then a giant rock blocked the path. And the Roman historian Livy says Hannibal heated it with fire, splashed it with sour wine, and cracked it apart!", { at: ["rock"] }),
    { who: "HANNIBAL", text: "Heat your rock for six hours.", add: [120, 300, 520, "br", 40], el: "chef", at: ["banner", "chef"], sfx: [["sting", 0]] },
    { who: "HANNIBAL", text: "A generous splash of vinegar. Season with violence.", add: [120, 300, 560, "br", 38], el: "chef", at: ["vinegar"] },
    { who: "HANNIBAL", text: "And… smash.", b: "b-smash", el: "chef", sfx: [["crack", 0.6]] },
    N("Is it true? Historians argue about it. Is it awesome? No historian has ever argued about that."),
  ],
  "20": [
    N("After fifteen days in the mountains, they stumbled out into Italy. Of ninety thousand infantry… roughly twenty thousand were left. Six thousand cavalry. And thirty-seven elephants—", { at: ["army", "cnt-0@0.3", "cnt-1@0.62", "cnt-2@0.85"] }),
    N("—who were totally fine? Somehow? Nobody knows how!", { at: ["surus"] }),
    { who: "SURUS", text: "Worst beach ever.", b: "b-beach", el: "surus" },
    N("He'd lost most of his army. But he was in Italy, and Rome had not seen it coming, because nobody had ever been crazy enough to try."),
  ],
  "21": [
    { who: "FLACCUS", text: "He WALKED?! Over the ALPS?! With ELEPHANTS?! …Is that allowed?", el: "senate", at: ["senate"], sfx: [["spit", 0.5]] },
    N("Scipio rushed back and met Hannibal's cavalry at the Ticinus River. It went badly.", { at: ["numidians", "dust", "scipio"], sfx: [["gallop", 0]] }),
    N("Scipio was wounded — and only survived because his seventeen-year-old son charged into the fight and dragged him out.", { at: ["publius"] }),
    { who: "PUBLIUS", text: "Dad! I've got you!", add: [80, 300, 420, "bl", 42], el: "publius" },
    { who: "SCIPIO", text: "Publius?! You're supposed to be guarding the luggage!", add: [560, 300, 620, "bl", 36], el: "scipio" },
    { who: "PUBLIUS", text: "The luggage is fine!", b: "b-welcome", el: "publius", keep: true, at: ["ptr"] },
  ],
  "22": [
    N("The local Gauls hated Rome, so they flocked to join him by the thousands!", { at: ["fires"] }),
    { who: "FLACCUS", text: "Dennis. How many legions do we have?", add: [960, 200, 440, "br", 36], el: "flaccus-pip", at: ["flaccus-pip"] },
    { who: "DENNIS", text: "Plenty, sir.", add: [1180, 60, 280, "br", 42], pip: ["dennis", "dennis", 1600, 190, "DENNIS (ACCOUNTS)"] },
    { who: "FLACCUS", text: "Okay. More legions.", add: [1000, 210, 380, "br", 40], el: "flaccus-pip" },
    N("Rome was about to find out just how bad this was going to get."),
    { who: "SURUS", text: "Are we there yet?", b: "b-yet", el: "surus", keep: true },
    { who: "HANNIBAL", text: "We haven't even started.", b: "b-close", el: "surus", keep: true, at: ["endcard"], sfx: [["sting", 1.0]] },
  ],
};
Object.assign(VOICES, VOICES_A2);
Object.assign(META, META_A2);
Object.assign(FRAMES, FRAMES_A2);
Object.assign(VOICES, VOICES_A34);
Object.assign(META, META_A34);
Object.assign(FRAMES, FRAMES_A34);

// 15-minute cut (YouTube): whole scenes dropped and a few lines trimmed. Nothing is re-voiced —
// the remaining lines keep their cached takes. Remove an entry here to restore that material.
export const CUT = ["07", "08", "14", "18", "19", "33", "35", "36", "37", "41", "42", "45", "54"];
export const DROP = { "10": [5], "22": [4], "39": [2], "43": [4, 5], "53": [5] };
for (const k of CUT) delete FRAMES[k];
for (const [k, ix] of Object.entries(DROP)) for (const i of [...ix].sort((a, b) => b - a)) FRAMES[k].splice(i, 1);

