# Absent Architect E2.4 — independent witness

Finite synthetic experiment; no claim of physical cosmology, literal holographic hardware, consciousness, actual independent security domains or real-world manipulation. Inspired by Φ011, E2.3 and NBGPocketMesh's declared lineage constraints; no cross-repository execution. Earlier experiments untouched.

## Frozen protocol

90 paired integer seeds (1–90), nine roots arranged as 3×3, three declared observation domains (rows). All roots initially share a hidden rotation/translation rule selected from the supplied 36-member family. Six local initial categorical observations (training cues 0,1,3 repeated twice), then 36 chronological rounds, cycling the same training cues. Four distinct final cues (5–8) scored after each round; no evaluation feedback to learner. Evaluator selects unannounced boundary (zero-indexed rounds 9–20). Stable: unchanged. Global-shift: all roots change to same different rule. Local-shift: one uniformly selected root changes; peers remain stable. Shared-burst: four rounds of identical forced incorrect observation offset across all roots and replicas; actual rules unchanged. Domain-burst: same corruption restricted to one selected row. Outside bursts, independently generated 10% categorical noise, wrong offset uniform among 1–8. Paired observations are fixed before any learner runs; no active intervention.

Policies: local1 reads own first sample, local3 reads three own replicas, same-domain3 reads own first sample and first sample from two row peers, diverse3 reads own and first samples from two column peers (distinct declared domains), adaptive-diverse asks those peers only if the local sample disagrees with prior MAP prediction or confidence <.9. Three-sample fusion uses majority; when no majority, retain own sample. Peers report their *own* local state, not the requester's state; local shifts deliberately violate shared-target assumption. All policies use same E2.3-style two-consecutive-mismatch reset and .9 posterior gate; fused observations are processed using a fixed .9/.0125 likelihood, not corrected for fusion, so confidence is not calibrated. No independent audit step. No model training, learned trust or real communication network.

Read-only simulated port binds actor to root and allows at most three distinct declared observations per round. Invalid scope, duplicates and exhausted budget throw before disclosing a sample. In-process convention, not authentication, isolation or cryptographic receipts. Decisions see no future observations, regime or change time. Causal prefix tests included. Declared separate domains are not proof of independent faults; shared burst explicitly violates independence. Deterministic pseudorandom fixtures, not independent populations.

## Metrics

Observation accuracy is fused categorical measurement vs the actor's local clean target, over all 36 rounds. Post correct/wrong are fractions of all final opportunities after boundary; abstentions count neither. Affected correct/wrong only for genuinely changed roots (all in global-shift, one per world in local-shift); n/a otherwise. Report also includes unaffected wrong rate. False alarms: all alarms for unchanged roots or before actual change, divided by nine roots per trace. Detection: at least one alarm on a changed root after boundary; may include chance alarms. Delay is conditional on detection. Utility +3 correct, -2 wrong, -.25 per requested observation and -.1 per peer message (charged per recipient, not unique sensor acquisition); full includes initial six observations and pre-boundary rewards; post only includes post-boundary outcomes and request costs. Cost coefficients chosen, not an actual economy. Local3 and fixed peer variants match reads but not messages; adaptive differs in both. No claim of statistical significance, optimized fusion, empirical calibration or universal superiority.

## Run

    node experiments/absent-architect-e24.mjs test
    node experiments/absent-architect-e24.mjs report 90

73637 assertions passed in authoring JS runtime. Means per resident unless otherwise noted.

| Regime | Policy | Observation acc. | Post correct/all | Post wrong/all | Affected correct/all | Affected wrong/all | Reads | Messages | False alarms | Detection | Delay | Full utility | Post utility |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| stable | local1 | 89.93% | 97.77% | 0.46% | n/a | n/a | 42.000 | 0.000 | 0.647 | n/a | n/a | 409.959 | 246.594 |
| stable | local3 | 98.10% | 99.95% | 0.01% | n/a | n/a | 114.000 | 0.000 | 0.019 | n/a | n/a | 403.158 | 242.224 |
| stable | same-domain3 | 97.93% | 99.88% | 0.03% | n/a | n/a | 114.000 | 72.000 | 0.036 | n/a | n/a | 395.627 | 237.718 |
| stable | diverse3 | 98.01% | 99.98% | 0.01% | n/a | n/a | 114.000 | 72.000 | 0.017 | n/a | n/a | 395.980 | 237.997 |
| stable | adaptive-diverse | 98.13% | 99.99% | 0.00% | n/a | n/a | 49.311 | 7.311 | 0.015 | n/a | n/a | 418.661 | 251.610 |
| global-shift | local1 | 89.93% | 89.62% | 5.97% | 89.62% | 5.97% | 42.000 | 0.000 | 0.258 | 99.75% | 1.200 | 379.379 | 216.014 |
| global-shift | local3 | 98.10% | 93.92% | 5.42% | 93.92% | 5.42% | 114.000 | 0.000 | 0.006 | 100.00% | 1.252 | 378.265 | 217.332 |
| global-shift | same-domain3 | 97.93% | 93.84% | 5.49% | 93.84% | 5.49% | 114.000 | 72.000 | 0.016 | 100.00% | 1.265 | 370.606 | 212.697 |
| global-shift | diverse3 | 98.01% | 93.91% | 5.41% | 93.91% | 5.41% | 114.000 | 72.000 | 0.012 | 100.00% | 1.251 | 370.996 | 213.013 |
| global-shift | adaptive-diverse | 98.06% | 93.72% | 5.63% | 93.72% | 5.63% | 53.348 | 11.348 | 0.012 | 100.00% | 1.301 | 391.333 | 224.282 |
| local-shift | local1 | 89.93% | 96.84% | 1.07% | 89.60% | 5.97% | 42.000 | 0.000 | 0.606 | 100.00% | 1.244 | 406.509 | 243.144 |
| local-shift | local3 | 98.10% | 99.26% | 0.63% | 93.79% | 5.54% | 114.000 | 0.000 | 0.019 | 100.00% | 1.267 | 400.311 | 239.377 |
| local-shift | same-domain3 | 92.05% | 89.65% | 9.53% | 13.07% | 84.24% | 114.000 | 72.000 | 0.132 | 37.78% | 10.647 | 352.791 | 194.882 |
| local-shift | diverse3 | 92.13% | 89.82% | 9.39% | 12.76% | 83.47% | 114.000 | 72.000 | 0.098 | 38.89% | 8.229 | 353.542 | 195.559 |
| local-shift | adaptive-diverse | 93.26% | 91.59% | 7.92% | 27.95% | 70.29% | 52.462 | 10.462 | 0.080 | 38.89% | 8.229 | 382.188 | 215.136 |
| shared-burst | local1 | 79.93% | 76.36% | 10.84% | n/a | n/a | 42.000 | 0.000 | 2.888 | n/a | n/a | 336.715 | 173.350 |
| shared-burst | local3 | 87.25% | 80.78% | 10.09% | n/a | n/a | 114.000 | 0.000 | 2.290 | n/a | n/a | 336.219 | 175.285 |
| shared-burst | same-domain3 | 87.05% | 80.78% | 10.15% | n/a | n/a | 114.000 | 72.000 | 2.306 | n/a | n/a | 328.798 | 170.888 |
| shared-burst | diverse3 | 87.21% | 80.89% | 10.10% | n/a | n/a | 114.000 | 72.000 | 2.288 | n/a | n/a | 329.236 | 171.253 |
| shared-burst | adaptive-diverse | 87.27% | 80.81% | 10.19% | n/a | n/a | 59.333 | 17.333 | 2.288 | n/a | n/a | 348.004 | 180.952 |
| domain-burst | local1 | 86.57% | 90.57% | 3.93% | n/a | n/a | 42.000 | 0.000 | 1.409 | n/a | n/a | 385.354 | 221.989 |
| domain-burst | local3 | 94.49% | 93.60% | 3.38% | n/a | n/a | 114.000 | 0.000 | 0.775 | n/a | n/a | 380.943 | 220.010 |
| domain-burst | same-domain3 | 94.31% | 93.44% | 3.41% | n/a | n/a | 114.000 | 72.000 | 0.798 | n/a | n/a | 373.144 | 215.235 |
| domain-burst | diverse3 | 96.73% | 99.21% | 0.27% | n/a | n/a | 114.000 | 72.000 | 0.165 | n/a | n/a | 393.553 | 235.570 |
| domain-burst | adaptive-diverse | 96.91% | 99.26% | 0.30% | n/a | n/a | 51.936 | 9.936 | 0.151 | n/a | n/a | 415.329 | 248.277 |

## Next gate

Add evidence about whether peers actually share the target, learn reliability under correlated failure, and test robust abstention against local shifts before using peer testimony to authorize any consequential action. Compare stronger local repeated-observation and uncertainty-aware fusion strategies. Voluntary exchange must use separate consent and conservation invariants.
