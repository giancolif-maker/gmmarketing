// Act 2 cue sheet (frames 23–33). Same line format as cues.mjs; move: [id, frac, {dx,dy,dr,ds,o}, dur],
// count: [id, frac, from, to], hide: [ids].
const N = (text, x = {}) => ({ who: "NARRATOR", text, ...x });
export const VOICES_A2 = {
  SEMPRONIUS: ["am_adam", 1.15], FLAMINIUS: ["am_liam", 1.08], FABIUS: ["bm_daniel", 0.95, "en-gb"],
  MAHARBAL: ["am_fenrir", 1.05], SOLDIER: ["am_eric", 1.0],
};
export const META_A2 = { "23": { lead: 3.4, intro: "act" } };
export const FRAMES_A2 = {
  "23": [
    N("Rome sent the other consul, Sempronius Longus, to deal with Hannibal at the River Trebia. It was December. It was snowing.", { at: ["table"] }),
    { who: "HANNIBAL", text: "Gisgo, take some horsemen, go poke the Romans. Then run away.", add: [140, 330, 600, "bl", 38], el: "hannibal" },
    { who: "GISGO", text: "That's it?", add: [1280, 400, 280, "br", 46], el: "gisgo" },
    { who: "HANNIBAL", text: "That's the whole plan.", add: [220, 380, 440, "bl", 42], el: "hannibal", keep: true },
  ],
  "24": [
    N("At dawn, Numidian cavalry rode up to the Roman camp and threw things at it. Sempronius was furious. He marched his whole army out — before breakfast — and waded across the freezing river, chest-deep.", { at: ["romans", "sempronius@0.5", "temp@0.85"], sfx: [["splash", 6.0]] }),
    { who: "SEMPRONIUS", text: "Charge! Ch-ch-charge!", add: [160, 480, 460, "bl", 44], el: "sempronius" },
    N("On the other side, Hannibal's men had eaten a hot breakfast and rubbed olive oil on themselves to keep warm.", { at: ["carths", "shine@0.7"] }),
    { who: "GISGO", text: "Toasty.", add: [1400, 120, 260, "bl", 50], el: "gisgo", keep: true, at: ["gisgo"] },
  ],
  "25": [
    N("Then Hannibal's brother Mago burst out of a hidden riverbed behind the Romans.", { at: ["mago", "mago-arrow"], move: [["r-army", 0.1, { dy: -190 }, 1.6]], sfx: [["boom", 0.5]] }),
    N("Rome lost something like twenty thousand men.", { move: [["mago", 0.1, { dy: -60 }, 1.0], ["r-army", 0.2, { ds: 0.7, o: 0.4 }, 1.2]] }),
    N("Hannibal lost… mostly elephants. The cold killed nearly all of them.", { count: [["el-counter", 0.45, 37, 1]], at: ["surus@0.4"], sfx: [["scratch", 1.2]] }),
    { who: "SURUS", text: "Hello? …Guys?", add: [1180, 520, 360, "br", 44], el: "surus" },
    { who: "FLACCUS", text: "Okay. More legions.", b: "flaccus-pip", keep: true },
  ],
  "26": [
    N("Next spring, Hannibal took a shortcut through a flooded marsh. For four days and three nights his army waded through water, sleeping on piles of dead pack animals.", { at: ["waders", "st-days@0.5"] }),
    N("Hannibal caught an eye infection — and lost the sight in one eye.", { at: ["patch@0.7"], sfx: [["sting", 2.6]] }),
    { who: "HANNIBAL", text: "Shortcut.", add: [700, 380, 280, "br", 50], el: "hannibal" },
    { who: "GISGO", text: "It was not a shortcut, sir.", add: [1180, 420, 480, "bl", 40], el: "gisgo", keep: true },
  ],
  "27": [
    N("Chasing him was a new consul, Flaminius. Hannibal hid his whole army in the hills above Lake Trasimene, on a foggy morning, and waited.", { at: ["flaminius", "fog@0.6"] }),
    { who: "FLAMINIUS", text: "Lovely fog. Can't see a thing. Onward!", add: [1040, 520, 520, "br", 40], el: "flaminius", move: [["r-col", 0.2, { dx: 260 }, 2.4]] },
    N("The Romans marched into the gap between the hills and the lake. And the hills attacked.", { move: [["c-hide", 0.55, { dy: 190 }, 0.8], ["fog", 0.5, { o: 0.25 }, 1.0]], sfx: [["crash", 2.4]] }),
    N("In about three hours, around fifteen thousand Romans were killed, some drowning in the lake trying to swim away in armor. Flaminius died too.", { move: [["r-col", 0.3, { dy: 70, o: 0.35 }, 1.4], ["flaminius", 0.85, { dr: 85, o: 0.6 }, 0.5]], count: [["consul-counter", 0.9, 0, 1]] }),
    { who: "FLACCUS", text: "Okay… more legions?", b: "flaccus-pip", keep: true },
  ],
  "28": [
    N("Rome was now properly scared, and appointed a dictator: Quintus Fabius Maximus. His strategy was revolutionary: don't fight Hannibal.", { at: ["fabius", "flaccus"] }),
    { who: "FABIUS", text: "We follow him. We watch him. We take his food. And we never — ever — give him a battle.", el: "fabius", at: ["plan-0@0.05", "plan-1@0.25", "plan-2@0.45", "plan-3@0.7"] },
    { who: "FLACCUS", text: "That's cowardly.", add: [1280, 330, 340, "br", 42], el: "flaccus" },
    { who: "FABIUS", text: "It's patient.", add: [260, 330, 300, "bl", 42], el: "fabius" },
    { who: "FLACCUS", text: "It's boring.", add: [1300, 330, 300, "br", 42], el: "flaccus", keep: true },
    N("The Romans called him Cunctator: \"the Delayer.\" It was not a compliment. Yet.", { at: ["st-delay"] }),
  ],
  "29": [
    N("Once, Fabius actually trapped Hannibal in a valley. So at night, Hannibal tied burning sticks to the horns of two thousand cattle and stampeded them up a hillside.", { at: ["cows@0.5", "st-cows@0.75"], move: [["cows", 0.75, { dx: 120, dy: -170 }, 3.0]] }),
    N("The Romans guarding the pass saw thousands of torches and assumed the whole army was escaping that way. They ran after the torches.", { at: ["romans"], move: [["romans", 0.55, { dx: -380, dy: -120 }, 2.2]] }),
    N("It was cows. Hannibal's army walked out through the empty pass.", { at: ["sneak"], move: [["sneak", 0.3, { dx: 380 }, 2.6]] }),
    { who: "SOLDIER", text: "Sir… I've captured… a cow.", add: [180, 520, 460, "bl", 40], at: ["captor"], keep: true, sfx: [["boing", 1.6]] },
  ],
  "30": [
    N("Rome got bored of being patient. In 216 BC, they raised the largest army they had ever put in the field — around eighty thousand men — and sent both consuls, Varro and Paullus, to crush Hannibal for good. They met at Cannae.", { at: ["romans@0.3"] }),
    { who: "GISGO", text: "Sir… there are so many of them.", add: [560, 520, 440, "bl", 38], el: "gisgo" },
    { who: "HANNIBAL", text: "Gisgo, there's something even more astonishing.", add: [120, 520, 480, "bl", 36], el: "hannibal" },
    { who: "GISGO", text: "What?", add: [620, 560, 200, "bl", 48], el: "gisgo" },
    { who: "HANNIBAL", text: "In all that crowd, not one of them is named Gisgo.", add: [100, 470, 560, "bl", 36], el: "hannibal", keep: true },
    N("That joke is real. Plutarch recorded it. Hannibal's whole army burst out laughing, and the Romans had no idea why.", { at: ["st-real", "laugh@0.45", "confused@0.8"] }),
  ],
  "31": [
    N("The Roman plan: make the middle extra deep, and push straight through. Hannibal's plan: let them. He put his weakest troops in the center, curved forward.", { at: ["rome", "c-center@0.5", "c-left@0.6", "c-right@0.6", "cav-l@0.6", "cav-r@0.6"] }),
    N("The Romans pushed. The center bent back… and back… into a U — while his best veterans waited on the sides.", { at: ["push"], move: [["rome", 0.1, { dy: -150 }, 3.5], ["c-center", 0.1, { dy: -150 }, 3.5], ["push", 0.1, { dy: -150 }, 3.5]] }),
    N("Then the sides closed in. Then Hannibal's cavalry, who had already chased off the Roman horsemen, slammed into the Roman rear.", { move: [["c-left", 0.05, { dx: 120, dy: 150, dr: 90 }, 1.4], ["c-right", 0.05, { dx: -120, dy: 150, dr: -90 }, 1.4], ["cav-l", 0.5, { dx: 470, dy: 400 }, 1.6], ["cav-r", 0.5, { dx: -470, dy: 400 }, 1.6], ["push", 0.0, { o: 0 }, 0.3]], sfx: [["crash", 3.5]] }),
  ],
  "32": [
    N("Eighty thousand men were surrounded. Packed so tightly that many couldn't even lift their swords. By sunset, somewhere around fifty thousand Romans were dead. Including the consul Paullus. And around eighty senators.", { at: ["senators@0.8"] }),
    N("It's one of the bloodiest days of battle in all of history.", { count: [["consul-counter", 0.2, 1, 2]] }),
  ],
  "33": [
    N("Hannibal's cavalry commander, Maharbal, said: give me the cavalry, and in five days you'll eat dinner in Rome. Hannibal said: not yet.", { at: ["st-5days@0.5"] }),
    { who: "MAHARBAL", text: "You know how to win a victory, Hannibal. You don't know how to use one.", add: [900, 300, 640, "bl", 38], el: "maharbal", keep: true },
    N("People are still arguing about whether Maharbal was right."),
  ],
};
