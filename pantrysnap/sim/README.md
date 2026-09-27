# Adversarial simulation

```sh
npm run sim     # ~50 s, no network, no credentials
```

Stress-tests the real product code with **synthetic** inputs. It is not evidence of real
AI accuracy, recipe quality, or user behaviour — see `FINDINGS.md` for what it can and
cannot tell us.

| File             | What it is                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `kitchens.ts`    | 52 hand-written synthetic kitchens with ground-truth inventories                           |
| `vision.ts`      | 15 labelled classes of injected vision error (A–O)                                         |
| `ai.ts`          | list-faithful simulated recipe model (obeys time/servings; uses only the list it's given)  |
| `attacks.ts`     | 55 adversarial recipes/inputs + 104 directional matching pairs, each with the safe outcome |
| `personas.ts`    | 20 rule-based personas (assumptions, not research)                                         |
| `offline.sim.ts` | trust experiment, attacks, matching, effort accounting, persona journeys                   |
| `latency.sim.ts` | 28 latency/failure scenarios through the real server orchestration (scripted gateway + DB) |
| `results/`       | generated output (`SIMULATION_DATA.md` = everything)                                       |
| `FINDINGS.md`    | interpretation and ranked failure modes                                                    |

Real product modules exercised: `ingredients.ts` (normalisation, typed parsing, matching,
step scanning), `recipe-validation.ts` (verification, exclusions, time, servings),
`ai-pipeline.server.ts` + `pantry.server.ts` (timeouts, retries, usage ledger calls) and the
evaluation scorer. Nothing in `src/` was changed for the simulation.
