// Joins the simulation outputs into sim/results/SIMULATION_DATA.md.
import fs from "node:fs";
const dir = new URL("./results/", import.meta.url);
const parts = ["offline.md", "latency.md"].map((f) => fs.readFileSync(new URL(f, dir), "utf8"));
fs.writeFileSync(new URL("SIMULATION_DATA.md", dir), parts.join("\n"));
console.log("sim/results/SIMULATION_DATA.md written");
