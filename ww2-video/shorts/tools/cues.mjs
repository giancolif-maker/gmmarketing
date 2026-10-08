// Shorts cue sheet: three purpose-made vertical Shorts (1080×1920), one frame each.
// Same N()/L() line format as ep1. Line options used here:
//   shot: "id" | "id@frac"   hard cut to a full-frame shot group (scenes in assets/lib/shorts-scenes.js)
//   at:   ["id@frac"]        reveal inside the current shot (st- slam, pop-, drop-, inr-/inl-, fall-)
//   cam:  [[frac, scale, px, py, dur]]  punch-in on the current shot (frame coords)
//   el:   speaker element id (talk bob)       sfx: [[name, offsetSec, vol?]]
//   count:[[id, frac, from, to, dur?]]       hud: [[frac, text]] corner counter text
// META[short]: { tail, name, title } — tail covers the final slam + the 1.5 s "Full episode" line.
export const VOICES = {
  NARRATOR: ["bm_george", 1.0, "en-gb"], HITLER: ["am_adam", 1.12], CHAMBERLAIN: ["bm_fable", 1.05, "en-gb"],
  KLAUS: ["am_puck", 1.1], OFFICER: ["am_fenrir", 1.02], CUSTOMER: ["am_michael", 1.12], WAITER: ["am_eric", 1.0],
};
const N = (text, x = {}) => ({ who: "NARRATOR", text, ...x });
const L = (who, text, x = {}) => ({ who, text, ...x });

export const META = {
  s1: { name: "last-one-promise", tail: 2.4, endSlam: "st-war" },
  s2: { name: "the-coffee", tail: 1.9 },
  s3: { name: "the-tractor", tail: 3.2, endSlam: "st-tank" },
};

export const FRAMES = {
  s1: [
    N("How many times can one man say \"last one\"?", { shot: "h1", at: ["inr-h1hit"], sfx: [["whoosh", 0]], cam: [[0.55, 1.25, 540, 760, 0.5]], hud: [[0, "0"]] }),
    N("1936. The Rhineland.", { shot: "f1", at: ["st-f1form"], hud: [[0.3, "1"]] }),
    L("HITLER", "Last one. Promise.", { shot: "h2", el: "h2hit", cam: [[0.4, 1.2, 540, 700, 0.4]] }),
    N("1938. Austria.", { shot: "f2", at: ["drop-f2form", "pop-f2stain@0.6"], hud: [[0.3, "2"]], sfx: [["whoosh", 0]] }),
    L("HITLER", "Last one. Promise.", { shot: "h3", el: "h3hit", cam: [[0.3, 1.25, 540, 640, 0.4]] }),
    L("HITLER", "Look, I've written \"last one\" in pen.", { shot: "f3", at: ["pop-f3pen@0.6"], hud: [[0.1, "3"]], cam: [[0.55, 1.35, 540, 1000, 0.4]] }),
    L("CHAMBERLAIN", "In pen! Splendid!", { shot: "c1", el: "c1cham", at: ["st-c1ok@0.35"] }),
    N("Then, Prague.", { shot: "c2", at: ["st-c2tag"], hud: [[0.3, "4"]] }),
    L("HITLER", "That one didn't need a form.", { shot: "h4", el: "h4hit", cam: [[0.5, 1.2, 540, 700, 0.5]] }),
    N("And then... Poland.", { shot: "f4", at: ["drop-f4nap"], sfx: [["whoosh", 0]], hud: [[0.5, "NO"]] }),
    L("HITLER", "I'm being honest now. Isn't that nice?", { shot: "h5", el: "h5hit", cam: [[0.45, 1.3, 540, 640, 0.6]] }),
  ],
  s2: [
    N("In 1923, your coffee got more expensive while you drank it.", { shot: "k1", el: "k1cust", count: [["k1price", 0, 5000, 10953, 3.2]], sfx: [["ding", 0.2, 0.3]] }),
    L("CUSTOMER", "One coffee, please.", { shot: "k2", el: "k2cust" }),
    L("WAITER", "Five thousand marks.", { shot: "k3", el: "k3wait", at: ["pop-k3board"] }),
    L("WAITER", "That'll be eight thousand.", { shot: "k4", count: [["k4price", 0.25, 5000, 8000, 0.9]], cam: [[0.1, 1.2, 540, 600, 0.4]], sfx: [["ding", 0.4]] }),
    L("CUSTOMER", "Eight?!", { shot: "k5", el: "k5cust" }),
    L("WAITER", "Ten thousand, nine hundred and fifty-three.", { shot: "k6", count: [["k6price", 0.2, 8000, 10953, 1.6]], cam: [[0.5, 1.25, 540, 560, 0.5]], sfx: [["ding", 1.2]] }),
    N("The government was printing money to pay its bills. Wages came in wheelbarrows.", { shot: "w1", at: ["inr-w1bar", "pop-w1cash@0.55"], sfx: [["whoosh", 0]] }),
    N("Banknotes were cheaper than kite paper.", { shot: "w2", at: ["pop-w2k1@0.1", "pop-w2k2@0.3", "pop-w2k3@0.5"] }),
    N("One dollar cost four point two trillion marks.", { shot: "w3", at: ["st-w3dollar@0.35"], cam: [[0, 1.0, 540, 960, 0.01]] }),
    L("CUSTOMER", "I was drinking it!", { shot: "k7", el: "k7cust", cam: [[0.1, 1.3, 540, 700, 0.3]] }),
  ],
  s3: [
    N("The treaty banned German tanks. So Germany built… tractors.", { shot: "t1", at: ["st-t1ban", "inr-t1trac@0.5"], sfx: [["whoosh", 0, 0.4], ["rumble", 1.6]] }),
    N("Very big tractors. With very thick armor.", { shot: "t2", cam: [[0.05, 1.25, 540, 900, 0.5], [0.55, 1.5, 700, 820, 0.4]] }),
    N("This is Klaus. Klaus handles supplies. Klaus reads the reports.", { shot: "t3", at: ["st-t3tag@0.1"], cam: [[0.6, 1.2, 540, 820, 0.6]] }),
    L("KLAUS", "Sir. This tractor has a cannon.", { shot: "t4", el: "t4klaus", cam: [[0.6, 1.15, 540, 760, 0.4]] }),
    L("OFFICER", "It's for farming.", { shot: "t5", el: "t5off" }),
    L("KLAUS", "Farming what?", { shot: "t6", el: "t6klaus" }),
    L("OFFICER", "…France.", { shot: "t7", el: "t7off", cam: [[0, 1.0, 540, 960, 0.01], [0.05, 1.9, 540, 620, 0.25]], sfx: [["sting", 0.1, 0.35]] }),
  ],
};
