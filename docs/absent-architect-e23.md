# Absent Architect E2.3 — unannounced change and online recovery

Standalone synthetic experiment; not a claim about actual cosmology, holographic hardware, consciousness, hidden controllers, or real-world manipulation. Does not depend on unmerged E2.2; earlier experiments untouched.

## Protocol

90 deterministic paired seeds (1–90), nine roots each, 36 supplied modular 3×3 rotation/translation rules. Six initial categorical observations on training cues 0,1,3. Then 36 chronological rounds, one categorical observation per round cycling those cues; four different held-out cues 5–8 scored after each observation. No evaluator feedback reaches the learner. The learner receives only observation records, never regime, hidden rule, change time, or score. Prefix tests check causality; not process isolation. Initial acquisition and all online observation errors independently generated at 10% probability, with a wrong target chosen uniformly among eight alternatives. Stepwise observations are paired across policies.

Evaluator selects a hidden boundary uniformly from zero-indexed rounds 9–20. Stable: no change. Related: exactly one rule parameter changes at boundary. Unrelated: both change. Burst: stable rule but four consecutive forced wrong online observations starting at boundary; no physical rule change. Scrambled: fixed random targets per cue after boundary, potentially coincidentally in family. Stable and burst still have a boundary solely for reporting matched post-window metrics. Categorical observations are richer than E2 binary observations. Fixed seed PRNG fixtures are not independent real populations.

## Policies

All except abstain purchase the six initial observations. Frozen buys no online observations. Cumulative, window6, hazard and alarm-reset purchase one per round (42 total). Cumulative updates full posterior; window6 refits from the last six observations including initial data; hazard mixes .9 prior posterior + .1 uniform each round before update; alarm-reset compares each new observation to preceding MAP model, resets on two consecutive mismatches (replaying the last two samples), otherwise updates cumulatively. Alarm can occur during recovery or low confidence and is not a calibrated test. Two mismatches can result from noise or from changing predictions, not necessarily a change. Reset threshold and hazard are supplied, not learned. Uniform prior, fixed .9/.0125 likelihood, deterministic MAP ties. All non-abstaining policies predict only when posterior max >=.9; no separate audit observation in this experiment. Abstain buys no data, makes no predictions. Frozen and abstain receive the stream as an inert clock in the implementation; their decisions do not depend on sample values. No access to held-out labels; no actual Keyhole integration, process sandbox, or signed receipts.

## Metrics

Post-window correct/wrong/coverage are pooled over all four held-out opportunities after evaluator boundary, not conditional on admission. Utility +3 correct, -2 wrong, -.25 per observation over entire trace, including initial acquisition. This is a synthetic objective, not an economy. False alarms counts all alarms for stable/burst and pre-boundary alarms for changing regimes; post-boundary alarms are not individually verified as true changes. Detection is at least one alarm at/after boundary, including chance alarms; delay from boundary to first alarm conditional on detection. Misses excluded from mean delay and separately reflected in detection rate. Only alarm-reset emits alarms. No threshold optimization or empirical calibration; no significance claim. More observations, repeated cues, and different evaluation horizons prevent comparison with E2.2 scores.

## Reproduce

    node experiments/absent-architect-e23.mjs test
    node experiments/absent-architect-e23.mjs report 90

2307 assertions passed in authoring JS runtime.

| Regime | Policy | Post correct/all | Post wrong/all | Post coverage | Full utility | False alarms/trace | Detection | Delay (rounds) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| stable | frozen | 98.34% | 0.12% | 98.46% | 423.211 | 0.000 | n/a | n/a |
| stable | cumulative | 100.00% | 0.00% | 100.00% | 421.357 | 0.000 | n/a | n/a |
| stable | window6 | 98.49% | 0.21% | 98.70% | 414.706 | 0.000 | n/a | n/a |
| stable | hazard | 85.75% | 0.07% | 85.83% | 359.763 | 0.000 | n/a | n/a |
| stable | alarm-reset | 97.52% | 0.64% | 98.16% | 409.947 | 0.610 | n/a | n/a |
| stable | abstain | 0.00% | 0.00% | 0.00% | 0.000 | 0.000 | n/a | n/a |
| related | frozen | 0.00% | 98.46% | 98.46% | 2.915 | 0.000 | n/a | n/a |
| related | cumulative | 15.87% | 80.85% | 96.72% | 67.411 | 0.000 | n/a | n/a |
| related | window6 | 84.25% | 9.19% | 93.44% | 362.823 | 0.000 | n/a | n/a |
| related | hazard | 76.07% | 0.60% | 76.67% | 334.020 | 0.000 | n/a | n/a |
| related | alarm-reset | 88.87% | 6.42% | 95.29% | 377.862 | 0.214 | 99.75% | 1.166 |
| related | abstain | 0.00% | 0.00% | 0.00% | 0.000 | 0.000 | n/a | n/a |
| unrelated | frozen | 12.32% | 86.13% | 98.46% | 55.581 | 0.000 | n/a | n/a |
| unrelated | cumulative | 25.85% | 70.89% | 96.74% | 110.014 | 0.000 | n/a | n/a |
| unrelated | window6 | 85.57% | 8.17% | 93.74% | 367.974 | 0.000 | n/a | n/a |
| unrelated | hazard | 76.05% | 0.46% | 76.51% | 334.219 | 0.000 | n/a | n/a |
| unrelated | alarm-reset | 89.35% | 5.76% | 95.11% | 380.217 | 0.214 | 99.75% | 1.121 |
| unrelated | abstain | 0.00% | 0.00% | 0.00% | 0.000 | 0.000 | n/a | n/a |
| burst | frozen | 98.34% | 0.12% | 98.46% | 423.211 | 0.000 | n/a | n/a |
| burst | cumulative | 100.00% | 0.00% | 100.00% | 421.357 | 0.000 | n/a | n/a |
| burst | window6 | 78.85% | 5.25% | 84.10% | 355.738 | 0.000 | n/a | n/a |
| burst | hazard | 60.94% | 0.96% | 61.89% | 294.607 | 0.000 | n/a | n/a |
| burst | alarm-reset | 75.57% | 5.99% | 81.56% | 344.495 | 3.425 | n/a | n/a |
| burst | abstain | 0.00% | 0.00% | 0.00% | 0.000 | 0.000 | n/a | n/a |
| scrambled | frozen | 10.68% | 87.77% | 98.46% | 48.575 | 0.000 | n/a | n/a |
| scrambled | cumulative | 10.69% | 87.56% | 98.26% | 42.648 | 0.000 | n/a | n/a |
| scrambled | window6 | 6.62% | 50.31% | 56.92% | 93.463 | 0.000 | n/a | n/a |
| scrambled | hazard | 3.66% | 27.48% | 31.14% | 102.378 | 0.000 | n/a | n/a |
| scrambled | alarm-reset | 6.62% | 49.59% | 56.20% | 93.158 | 0.214 | 99.14% | 1.308 |
| scrambled | abstain | 0.00% | 0.00% | 0.00% | 0.000 | 0.000 | n/a | n/a |

Next: independently validate alarm thresholds, noise misspecification and false alarms, and evaluate actual utility against always abstain. No policy is entitled to operate on other agents or real systems.
