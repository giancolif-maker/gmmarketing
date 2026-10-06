// Act 2 cue sheet (frames 23–33). Same line format as cues.mjs; move: [id, frac, {dx,dy,dr,ds,o}, dur],
// count: [id, frac, from, to], hide: [ids], stk: [x, y, text, size, rot] sticker, pip: [id, preset, x, y, label].
// META.welcome = { consul, until, sign }: the Consul Welcome Pack office covers the scene until line `until`.
const N = (text, x = {}) => ({ who: "NARRATOR", text, ...x });
export const VOICES_A2 = {
  SEMPRONIUS: ["am_adam", 1.15], FLAMINIUS: ["am_liam", 1.08], FABIUS: ["bm_daniel", 0.95, "en-gb"],
  MAHARBAL: ["am_fenrir", 1.05], SOLDIER: ["am_eric", 1.0], VARRO: ["am_michael", 1.1], GISGO: ["am_echo", 1.12],
};
export const META_A2 = {
  "23": { lead: 3.4, intro: "act", welcome: { consul: "sempronius", until: 3, sign: 0 } },
  "27": { welcome: { consul: "flaminius", until: 3, sign: 0 } },
  "30": { welcome: { consul: "pair", until: 3, sign: 0 } },
};
const WF = "w-flaccus";
export const FRAMES_A2 = {
  "23": [
    { who: "FLACCUS", text: "Welcome to consul! Here's your army, your mug, and your enemy. Any questions?", add: [120, 300, 600, "bl", 36], el: WF },
    { who: "SEMPRONIUS", text: "Just one. What happened to the last guy?", add: [1200, 330, 500, "br", 38], el: "w-consul" },
    { who: "FLACCUS", text: "He's… resting.", add: [180, 330, 340, "bl", 44], el: WF, keep: true },
    N("Sempronius met Hannibal at the River Trebia. In December. In the snow. And Hannibal had a plan.", { at: ["table"] }),
    { who: "HANNIBAL", text: "Mago. Hide in that riverbed with a thousand men. Don't make a sound.", add: [140, 330, 600, "bl", 36], el: "hannibal" },
    { who: "MAGO", text: "How long?", add: [1300, 400, 280, "br", 46], el: "gisgo" },
    { who: "HANNIBAL", text: "Until it's funny.", add: [220, 380, 400, "bl", 44], el: "hannibal", keep: true },
  ],
  "24": [
    N("At dawn, Hannibal's Numidian cavalry rode up to the Roman camp and started throwing things at it. Sempronius was furious. So he marched his entire army out — before breakfast — straight through a freezing river, chest-deep.", { at: ["romans", "sempronius@0.55", "temp@0.85"], sfx: [["splash", 7.5]] }),
    { who: "SEMPRONIUS", text: "Ch-ch-charge! Wh-why is it ch-chunky?", add: [160, 480, 500, "bl", 42], el: "sempronius" },
    N("On the other side, Hannibal's men had eaten a hot breakfast by the fire and rubbed themselves down with olive oil to keep warm.", { at: ["carths", "shine@0.7"] }),
    { who: "MAGO", text: "Ahh. Good river.", add: [1400, 120, 330, "bl", 46], el: "gisgo", keep: true, at: ["gisgo"] },
  ],
  "25": [
    N("Then Mago burst out of the riverbed right behind them!", { at: ["mago", "mago-arrow"], move: [["r-army", 0.1, { dy: -190 }, 1.6]], sfx: [["boom", 0.4]] }),
    { who: "MAGO", text: "Is it funny yet?!", add: [700, 640, 360, "bl", 44], el: "mago" },
    N("Rome lost something like twenty thousand men.", { move: [["mago", 0.1, { dy: -60 }, 1.0], ["r-army", 0.2, { ds: 0.7, o: 0.4 }, 1.2]] }),
    N("And Hannibal lost… mostly elephants. The freezing winter killed nearly all of them.", { count: [["el-counter", 0.45, 37, 1]], at: ["surus@0.4"], sfx: [["scratch", 1.2]] }),
    { who: "SURUS", text: "Guys? …Hello?", add: [1180, 520, 340, "br", 44], el: "surus" },
    { who: "FLACCUS", text: "Dennis?", add: [1100, 80, 240, "br", 44], el: "flaccus-pip", at: ["flaccus-pip"] },
    { who: "DENNIS", text: "Down a few legions, sir.", add: [1120, 360, 420, "br", 40], pip: ["dennis", "dennis", 1600, 470, "DENNIS (ACCOUNTS)"] },
    { who: "FLACCUS", text: "Okay. More legions.", add: [1030, 100, 380, "br", 40], el: "flaccus-pip", keep: true },
  ],
  "26": [
    N("Next spring, Hannibal took a shortcut. Through a flooded marsh. For FOUR days and three nights. Nowhere dry to sleep — except on top of the dead pack animals.", { at: ["waders", "st-days@0.4"] }),
    N("And Hannibal caught an infection… and lost the sight in one eye.", { at: ["patch@0.75"], sfx: [["sting", 2.4]] }),
    { who: "HANNIBAL", text: "Shortcut.", add: [700, 380, 280, "br", 50], el: "hannibal" },
    { who: "MAGO", text: "Brother. You lost an EYE.", add: [1180, 420, 440, "bl", 40], el: "gisgo" },
    { who: "HANNIBAL", text: "And we saved a whole day.", add: [560, 380, 440, "br", 40], el: "hannibal", keep: true },
  ],
  "27": [
    { who: "FLACCUS", text: "Welcome to consul! Here's your army, your mug, and your enemy. Any questions?", add: [120, 300, 600, "bl", 36], el: WF },
    { who: "FLAMINIUS", text: "What happened to the last guy?", add: [1200, 330, 460, "br", 40], el: "w-consul" },
    { who: "FLACCUS", text: "He's… also resting.", add: [180, 330, 380, "bl", 42], el: WF, keep: true },
    N("Flaminius chased Hannibal to Lake Trasimene. Hannibal hid his entire army in the hills above the lake road, on a foggy morning… and waited.", { at: ["flaminius", "fog@0.6"] }),
    { who: "FLAMINIUS", text: "Can't see a thing in this fog. Excellent! That means they can't see us either!", add: [960, 480, 620, "br", 36], el: "flaminius", move: [["r-col", 0.2, { dx: 260 }, 2.4]] },
    N("Hey. Flaminius. Maybe… look at the hills?", { stk: [700, 200, "LOOK AT THE HILLS", 48, -4] }),
    { who: "FLAMINIUS", text: "Did somebody say something?", add: [1040, 520, 460, "br", 40], el: "flaminius" },
    N("In about three hours, fifteen thousand Romans were killed. Many drowned trying to swim away in their armor. Flaminius died too.", { move: [["c-hide", 0.0, { dy: 190 }, 0.8], ["fog", 0.0, { o: 0.25 }, 1.0], ["r-col", 0.3, { dy: 70, o: 0.35 }, 1.4], ["flaminius", 0.85, { dr: 85, o: 0.6 }, 0.5]], count: [["consul-counter", 0.9, 0, 1]], hide: ["st-k5"], sfx: [["crash", 0.1]] }),
    { who: "FLACCUS", text: "Dennis?", add: [1100, 80, 240, "br", 44], el: "flaccus-pip", at: ["flaccus-pip"] },
    { who: "DENNIS", text: "Sir, we're down… a consul.", add: [1100, 360, 440, "br", 40], pip: ["dennis", "dennis", 1600, 470, "DENNIS (ACCOUNTS)"] },
    { who: "FLACCUS", text: "Okay. More consuls.", add: [1030, 100, 380, "br", 40], el: "flaccus-pip", keep: true },
  ],
  "28": [
    N("Rome was now properly scared, so they appointed a dictator: Quintus Fabius Maximus! And his strategy was revolutionary: don't fight Hannibal.", { at: ["fabius", "flaccus"] }),
    { who: "FABIUS", text: "We follow him. We starve him. We annoy him. We never, ever give him a battle.", el: "fabius", at: ["plan-0@0.05", "plan-1@0.25", "plan-2@0.45", "plan-3@0.7"] },
    { who: "FLACCUS", text: "That's cowardly.", add: [1280, 330, 340, "br", 42], el: "flaccus" },
    { who: "FABIUS", text: "It's patient.", add: [260, 330, 300, "bl", 42], el: "fabius" },
    { who: "FLACCUS", text: "It's BORING.", add: [1300, 330, 300, "br", 42], el: "flaccus" },
    { who: "FABIUS", text: "It's working.", add: [260, 330, 300, "bl", 42], el: "fabius", keep: true },
    N("The Romans nicknamed him Cunctator: \"the Delayer.\" It was an insult. Give it time.", { at: ["st-delay"] }),
  ],
  "29": [
    N("Once, Fabius actually trapped Hannibal in a valley! So that night, Hannibal tied burning sticks to the horns of two thousand cows, and stampeded them up the hill.", { at: ["cows@0.5", "st-cows@0.75"], move: [["cows", 0.75, { dx: 120, dy: -170 }, 3.0]] }),
    { who: "MAGO", text: "This is either genius or the worst barbecue in history.", add: [1120, 120, 560, "br", 36] },
    N("The Romans guarding the pass saw thousands of torches, assumed the whole army was escaping that way, and ran after them. While Hannibal's army strolled out through the empty pass.", { at: ["romans", "sneak@0.7"], move: [["romans", 0.2, { dx: -380, dy: -120 }, 2.2], ["sneak", 0.72, { dx: 380 }, 2.6]] }),
    { who: "SOLDIER", text: "Sir! I've captured… one… cow.", add: [180, 520, 460, "bl", 40], at: ["captor"], keep: true, sfx: [["boing", 1.6]] },
  ],
  "30": [
    { who: "FLACCUS", text: "Welcome to consul! Both of you!", add: [120, 300, 520, "bl", 40], el: WF },
    { who: "VARRO", text: "What happened to the last guys?", add: [1100, 330, 480, "br", 40], el: "w-consul" },
    { who: "FLACCUS", text: "Don't worry about it. Here's eighty thousand men.", add: [120, 300, 560, "bl", 38], el: WF, keep: true },
    N("In 216 BC, Rome built the biggest army it had ever put in the field, and sent both consuls to crush Hannibal for good, at a place called Cannae.", { at: ["romans@0.3"] }),
    N("This is Gisgo. Gisgo is one of Hannibal's officers. Gisgo has exactly one moment in history, and this is it.", { stk: [1000, 940, "GISGO. NOT MAGO. DIFFERENT GUY.", 40, -2] }),
    { who: "GISGO", text: "Sir… there are SO many of them.", add: [560, 520, 440, "bl", 38], el: "gisgo" },
    { who: "HANNIBAL", text: "True. But Gisgo, there's something even more amazing.", add: [100, 500, 520, "bl", 36], el: "hannibal" },
    { who: "GISGO", text: "What?", add: [620, 560, 200, "bl", 48], el: "gisgo" },
    { who: "HANNIBAL", text: "Of all those thousands of men… not one of them is called Gisgo.", add: [100, 470, 580, "bl", 36], el: "hannibal", keep: true },
    N("That is a real joke! Plutarch wrote it down! And the whole army burst out laughing, and the Romans had no idea why.", { at: ["st-real", "laugh@0.45", "confused@0.8"] }),
    { who: "GISGO", text: "…I don't get it.", add: [620, 560, 320, "bl", 44], el: "gisgo", keep: true },
  ],
  "31": [
    N("Rome's plan: make the middle extra deep and just shove straight through! Hannibal's plan: let them. He put his weakest troops in the center, bulging forward.", { at: ["rome", "c-center@0.55", "c-left@0.65", "c-right@0.65", "cav-l@0.65", "cav-r@0.65"] }),
    N("The Romans pushed. The center bent back… and back… and back… into a U. While his best veterans waited on both sides.", { at: ["push"], move: [["rome", 0.1, { dy: -150 }, 3.5], ["c-center", 0.1, { dy: -150 }, 3.5], ["push", 0.1, { dy: -150 }, 3.5]] }),
    { who: "VARRO", text: "They're running! Push! PUSH!", add: [120, 80, 460, "bl", 40] },
    { who: "MAGO", text: "Brother, the middle is folding!", add: [1240, 80, 480, "br", 38] },
    { who: "HANNIBAL", text: "Yes. Like a napkin.", add: [1300, 80, 400, "br", 40], keep: true },
    N("Then the sides closed in. And then Hannibal's cavalry, who had already chased off the Roman horsemen, came back around and slammed into the Roman rear.", { move: [["c-left", 0.05, { dx: 120, dy: 150, dr: 90 }, 1.4], ["c-right", 0.05, { dx: -120, dy: 150, dr: -90 }, 1.4], ["cav-l", 0.5, { dx: 470, dy: 400 }, 1.6], ["cav-r", 0.5, { dx: -470, dy: 400 }, 1.6], ["push", 0.0, { o: 0 }, 0.3]], hide: ["a-4"], sfx: [["crash", 4.5]] }),
  ],
  "32": [
    N("Eighty thousand men were surrounded, packed in so tight many couldn't even raise their swords. By sunset, somewhere around fifty thousand Romans were dead. One of the consuls. Some eighty senators.", { at: ["senators@0.8"] }),
    N("More Romans were killed in a single afternoon than in almost any battle in history.", { count: [["consul-counter", 0.2, 1, 2]] }),
    N("It was the most perfect battle ever fought. Generals still study it today."),
  ],
  "33": [
    N("Hannibal's cavalry commander, Maharbal, said: give me the horsemen, and in five days you'll be eating dinner in Rome!", { at: ["st-5days@0.6"] }),
    { who: "HANNIBAL", text: "Not yet.", add: [300, 400, 260, "bl", 48] },
    { who: "MAHARBAL", text: "You know how to win a victory, Hannibal. You don't know how to use one.", add: [900, 300, 640, "bl", 38], el: "maharbal", keep: true },
    { who: "MAGO", text: "He's not wrong.", add: [1300, 640, 340, "br", 40] },
    N("Livy says that line is real. People have argued about it ever since. Mago has argued about it the hardest."),
  ],
};
