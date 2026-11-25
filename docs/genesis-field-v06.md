# Genesis Field v0.6 — Temporal relevance

Compare three fixed alternatives to v0.5, using actual v0.3/v0.5 learners and verified exchange. No LLM, network, arbitrary code execution or packages. All decisions are frozen before batch outcomes; each selector receives only its selected outcome. Identical deterministic arm outcomes are reused across policies for evaluator efficiency. Counterfactual costs are computed for evaluation, not presented to the learner.

## Protocol

Three streams use a new deterministic seed schedule and new random generator multiplier relative to v0.5. Each has 12 seeds, 144 batches per seed and four distinct quadratic target supports per batch. All batches reset relational memory; only the strategy policy persists across batches. Three streams: stationary 10% packet bias flips; abrupt 5%, 90%, 10% in three 48-batch phases; alternating 5%, 80% in six 24-batch phases. Corruption rates and phase boundaries are hidden from policies. These schedules are designed stress tests, not independently collected real-world streams. A fixed peer knowledge cost scope treats source acquisition as sunk, with historical source observations separately recorded.

- v05: actual previous policy, 12 most recent selected samples per arm and epsilon 0.12.
- decay: exponential decay with half-life 12 elapsed batches, plus a fixed weak prior (weight 0.5, mean cost 90). Same epsilon. Decay and prior are a bundled treatment.
- probe: v05 window mean plus overdue-arm selection when last observed at least 12 batches earlier. Most overdue first, deterministic tie break. Same epsilon when no probe due.
- combined: decay plus overdue probes.

Every policy starts without strategy history and forces initial exploration of each arm. No phase labels, future outcomes or true target rules enter the decision policy. Recipient observation costs include calibration, verification, exploration and fallback. Exact target equality and three held-out predictions per target checked in the evaluator. No equal-runtime or lifetime efficiency claims. Parameters were chosen for this exploratory run, not established by independent hyperparameter calibration. No explicit change detector was implemented.

## Executed results

Each stream: 1728 batches per policy, 6912 target rules and 20736 held-out predictions per policy. Across all four policies and three streams: 82944 exact target recoveries, 248832 correct held-out predictions, 108 new-policy mid-run checkpoint restores. All three static comparison arms were also checked for exact results on every batch. Nine regression checks passed in JavaScript execution.

| Policy | Stationary | Abrupt | Alternating |
|---|---:|---:|---:|
| Cold | 151655 | 151655 | 151655 |
| Memory | 167265 | 167265 | 167265 |
| Always peer | 115934 | 137145 | 143071 |
| v05 | 119969 | 141936 | 147636 |
| Decay | 119969 | 139423 | 147672 |
| Probe | 125276 | 143121 | 148500 |
| Combined | 125276 | 138575 | 145138 |
| Hindsight | 115702 | 125993 | 130750 |

Combined reduces v05 observation cost by 2.37% on abrupt and 1.69% on alternating, but costs 4.42% more on stationary. Always peer remains cheaper than every adaptive policy in each complete stream. Across the equal mixture, decay costs 407064, combined 408989, v05 409541; selecting a preferred policy from these same outcomes would be exploratory, not a held-out confirmation. Abrupt recovery phase peer choices: v05 20/576, decay 205/576, probe 99/576, combined 358/576. This supports faster renewed use, not general superiority. Historical sender costs for combined: stationary 130845, abrupt 94925, alternating 101458. For example abrupt fully charged combined costs 233500, exceeding cold 151655. Static policy source costs are not included in the report; no full-lifetime comparison across all methods is established.

Full per-trial phase totals, choice counts, historical source counts and replay records are committed. Checkpoints preserve all selected events; schema-6 replay reconstructs the decisions and rejects malformed canonical records, not forged but internally consistent histories. Disk CLI single writer uses exclusive temp and rename, not a power-loss guarantee. No concurrent writer protocol. Bounds: 360 rounds, 30 seeds, underlying finite query limits.

## Run

    node runtime/cli-v06.mjs test
    node runtime/cli-v06.mjs summary
    node runtime/cli-v06.mjs init temporal.json 12345 combined
    node runtime/cli-v06.mjs step temporal.json
    node runtime/cli-v06.mjs inspect temporal.json

Node 22. CLI step uses abrupt stream. CI replays summary and checks cross-process state. Earlier runtimes preserved.

## Next

Compare explicit change detection and budget-aware probing with independently specified stationary, abrupt and gradual drift streams. Include uncertainty about historical source availability, full acquisition cost and persistence of relational knowledge across batches. Do not choose a universal winner on this exploratory data. This is bounded online strategy learning, not general intelligence or sentience.
