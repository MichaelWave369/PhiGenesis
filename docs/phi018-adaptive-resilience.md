# Φ018 — Adaptive Resilience

Standalone synthetic successor to Φ017; no changes to previous experiments or integrated runtime. Two context-specific weights from a finite allowlist; fixed active configuration [4,4], authority NONE. All adaptation is simulated in shadow state. No LLM, arbitrary code generation, deployment, external services or permissions.

## Protocol

90 paired seeds, one calibration epoch (-1) then 18 evaluated epochs. Four regimes: stationary specialized labels; abrupt axis swap at epoch 9; recurrent swap at epoch 6 then return at 12; probe-noise with 25% expected independent corrupted probe labels in epochs 6–11 while confirmation and test labels stay clean. Each epoch has 54 labeled memory rows, 18 labeled probes, 18 separate labeled confirmation queries and 36 held-out queries, equally divided across contexts, distinct deterministic PRNG initial states per split. Memory is refreshed each epoch and labeled by current ground truth, an optimistic assumption. Same fixtures across policies. Finite domain may contain overlapping feature tuples.

Weighted Manhattan nearest neighbor, same context only, deterministic first-match ties. Fixed never searches; frozen searches at calibration only; periodic every three epochs; triggered at calibration and when current probe score trails fixed by >=2 correct or <=12/18, plus every six epochs; always-search every epoch. All receive the same labeled observations and pay for current and fixed probe monitoring, including fixed/frozen. Confirmation labels available to all, consumed by the search policies only on search epochs. Search evaluates exactly nine weight pairs {0,4,8} squared; candidate chosen on probes only, incumbent preferred on ties. Separate confirmation requires >=2 correct improvement over incumbent and no per-context loss relative to incumbent or fixed. Accepted candidate changes shadow only, before same-epoch test. No held-out feedback enters selection, and no future observations used. No automatic authority. Initial calibration is charged but not included in accuracy. Full comparison counts include monitoring, candidate search, confirmation, and fixed and shadow test evaluation. No wall time or memory claims. Thresholds and fixtures designed by author; not optimized or statistically validated.

## Reproduce

    node experiments/phi018-adaptive-resilience.mjs test
    node experiments/phi018-adaptive-resilience.mjs report 90

Authoring JS runtime: 8342 assertions passed. Mean accuracy over all evaluated epochs, and post-boundary (epoch 9 for abrupt; epoch 6 for others); boundary accuracy is same-epoch following the change, not a measured real-time recovery latency. Below-fixed counts are seed-epoch pairs (max 1620). Searches include calibration.

| Regime | Policy | Accuracy | Post-boundary | Boundary | Below fixed | Mean searches | Mean comparisons |
|---|---|---:|---:|---:|---:|---:|---:|
| stationary | fixed | 87.95% | 88.22% | 88.77% | 0 | 0.00 | 53460 |
| stationary | frozen | 93.06% | 93.15% | 93.49% | 14 | 1.00 | 59292 |
| stationary | periodic | 97.38% | 98.18% | 97.99% | 26 | 7.00 | 94284 |
| stationary | triggered | 96.80% | 97.62% | 97.41% | 25 | 4.11 | 77436 |
| stationary | always-search | 98.54% | 98.94% | 98.95% | 28 | 19.00 | 164268 |
| abrupt | fixed | 88.10% | 88.44% | 88.83% | 0 | 0.00 | 53460 |
| abrupt | frozen | 77.92% | 62.78% | 62.72% | 420 | 1.00 | 59292 |
| abrupt | periodic | 96.76% | 97.09% | 96.88% | 26 | 7.00 | 94284 |
| abrupt | triggered | 96.23% | 96.62% | 96.27% | 24 | 4.98 | 82490 |
| abrupt | always-search | 98.15% | 98.16% | 97.62% | 27 | 19.00 | 164268 |
| recurrent | fixed | 87.97% | 88.25% | 88.09% | 0 | 0.00 | 53460 |
| recurrent | frozen | 82.78% | 77.74% | 61.57% | 285 | 1.00 | 59292 |
| recurrent | periodic | 96.19% | 96.41% | 96.23% | 28 | 7.00 | 94284 |
| recurrent | triggered | 95.67% | 95.93% | 95.96% | 23 | 4.12 | 77501 |
| recurrent | always-search | 97.72% | 97.72% | 96.67% | 28 | 19.00 | 164268 |
| probe-noise | fixed | 87.95% | 88.22% | 88.77% | 0 | 0.00 | 53460 |
| probe-noise | frozen | 93.06% | 93.15% | 93.49% | 14 | 1.00 | 59292 |
| probe-noise | periodic | 97.30% | 98.06% | 97.72% | 27 | 7.00 | 94284 |
| probe-noise | triggered | 96.94% | 97.83% | 97.04% | 26 | 5.81 | 87350 |
| probe-noise | always-search | 98.47% | 98.84% | 98.70% | 28 | 19.00 | 164268 |

Replay recomputes the complete trace, not authentication or durable storage. Independent data does not imply independent security enforcement. Same observation availability does not mean equal compute or actual confirmation usage. No formal statistical inference. Changes in feature semantics are scripted; fresh labeled memory and immediate confirmation favor adaptation. Future work: delayed labels, stale memory, graded drift, false alarms, explicit observation acquisition cost, independent evaluator and durable lineage. No release readiness claim.
