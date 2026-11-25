# Absent Architect E2.5 — Sovereign observer

Standalone synthetic successor to E2.4. No physical cosmology, literal holographic hardware, consciousness, actual independent security domains, or real-world control claims.

## Protocol

90 paired integer seeds, nine roots, 36 online rounds and six initial categorical observations, same 36-member modular transformation family, evaluator, cue separation, five regimes and costs as E2.4. Five independent baseline-noise replicas per root per round (expanded from three, so seed trajectories differ from E2.4). Stable, global shift, local shift, shared four-round observation burst and single-domain burst. Peers observe their own targets, not the recipient's. All four held-out predictions evaluated against recipient's clean local state, no feedback. Fixed 10% categorical noise likelihood; shared faults break this assumption.

Policies: local1, local3 and local5 use own measurements with strict majority or first sample on ties. Diverse3 is one local plus two distinct-domain peers using E2.4 vote. Local-first5 and context-gate5 read three local and two distinct-domain peer samples. Local majority cannot be overwritten by peer testimony; in a three-way local tie, agreeing peer values can select one of the observed local values, otherwise first local sample. Context-gate5 also suppresses predictions on the first two consecutive rounds of disagreement between local majority and unanimous peers; the local model still updates. The streak resets when disagreement ceases, not when a new cue arrives. This heuristic does not distinguish a real local shift from a domain-wide sensor fault; continued disagreement does not imply local truth. All policies use same two-mismatch reset and confidence >=.9 gate. No separate audit, learned reliability, calibrated posterior, or optimal fusion. The local-first5 and context-gate5 read counts match local5, but incur extra message charges; local3 is a cheaper comparator. Provenance records preserve original samples, and the bounded port denies out-of-scope reads and duplicates. In-process simulation convention, no cryptographic identity, durable storage, process isolation or actual NBG integration.

Utility +3 correct, -2 wrong, -.25 per observation, -.1 per peer message. Post utility excludes pre-boundary rewards and costs; reported reads/messages/conflicts/withheld are full-trace means per resident. Correct and wrong fractions use all held-out opportunities including abstentions. Affected metrics only cover actually changed roots. Withheld counts gate activations even if the posterior would already abstain. No significance or empirical calibration claim; thresholds and costs chosen by author.

## Reproduce

    node experiments/absent-architect-e25.mjs test
    node experiments/absent-architect-e25.mjs report 90

127160 assertions passed in authoring JS runtime.

| Regime | Policy | Post correct | Post wrong | Changed-root correct | Changed-root wrong | Reads | Messages | Conflicts | Gate activations | Post utility |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| stable | local1 | 97.64% | 0.43% | n/a | n/a | 42.000 | 0.000 | 0.000 | 0.000 | 246.315 |
| stable | local3 | 99.93% | 0.00% | n/a | n/a | 114.000 | 0.000 | 0.000 | 0.000 | 242.179 |
| stable | local5 | 99.99% | 0.00% | n/a | n/a | 186.000 | 0.000 | 0.000 | 0.000 | 231.573 |
| stable | diverse3 | 99.99% | 0.00% | n/a | n/a | 114.000 | 72.000 | 2.954 | 0.000 | 238.036 |
| stable | local-first5 | 100.00% | 0.00% | n/a | n/a | 186.000 | 72.000 | 0.179 | 0.000 | 227.294 |
| stable | context-gate5 | 99.48% | 0.00% | n/a | n/a | 186.000 | 72.000 | 0.179 | 0.179 | 225.946 |
| global-shift | local1 | 89.46% | 5.90% | 89.46% | 5.90% | 42.000 | 0.000 | 0.000 | 0.000 | 215.736 |
| global-shift | local3 | 93.88% | 5.45% | 93.88% | 5.45% | 114.000 | 0.000 | 0.000 | 0.000 | 217.173 |
| global-shift | local5 | 94.36% | 5.41% | 94.36% | 5.41% | 186.000 | 0.000 | 0.000 | 0.000 | 207.708 |
| global-shift | diverse3 | 93.99% | 5.41% | 93.99% | 5.41% | 114.000 | 72.000 | 2.954 | 0.000 | 213.198 |
| global-shift | local-first5 | 94.28% | 5.41% | 94.28% | 5.41% | 186.000 | 72.000 | 0.179 | 0.000 | 203.173 |
| global-shift | context-gate5 | 93.83% | 5.35% | 93.83% | 5.35% | 186.000 | 72.000 | 0.179 | 0.179 | 202.128 |
| local-shift | local1 | 96.75% | 1.00% | 90.21% | 5.40% | 42.000 | 0.000 | 0.000 | 0.000 | 243.019 |
| local-shift | local3 | 99.25% | 0.58% | 93.88% | 5.14% | 114.000 | 0.000 | 0.000 | 0.000 | 239.449 |
| local-shift | local5 | 99.37% | 0.60% | 94.46% | 5.39% | 186.000 | 0.000 | 0.000 | 0.000 | 228.948 |
| local-shift | diverse3 | 89.92% | 9.40% | 14.21% | 83.63% | 114.000 | 72.000 | 4.207 | 0.000 | 195.791 |
| local-shift | local-first5 | 99.32% | 0.59% | 93.99% | 5.34% | 186.000 | 72.000 | 1.915 | 0.000 | 224.516 |
| local-shift | context-gate5 | 94.73% | 0.17% | 58.84% | 1.50% | 186.000 | 72.000 | 1.915 | 1.153 | 213.393 |
| shared-burst | local1 | 76.33% | 10.81% | n/a | n/a | 42.000 | 0.000 | 0.000 | 0.000 | 173.329 |
| shared-burst | local3 | 80.70% | 10.21% | n/a | n/a | 114.000 | 0.000 | 0.000 | 0.000 | 174.887 |
| shared-burst | local5 | 81.28% | 10.08% | n/a | n/a | 186.000 | 0.000 | 0.000 | 0.000 | 165.832 |
| shared-burst | diverse3 | 80.75% | 10.15% | n/a | n/a | 114.000 | 72.000 | 2.616 | 0.000 | 170.803 |
| shared-burst | local-first5 | 81.19% | 10.09% | n/a | n/a | 186.000 | 72.000 | 0.156 | 0.000 | 161.258 |
| shared-burst | context-gate5 | 80.84% | 10.07% | n/a | n/a | 186.000 | 72.000 | 0.156 | 0.156 | 160.394 |
| domain-burst | local1 | 90.54% | 3.86% | n/a | n/a | 42.000 | 0.000 | 0.000 | 0.000 | 222.029 |
| domain-burst | local3 | 93.52% | 3.38% | n/a | n/a | 114.000 | 0.000 | 0.000 | 0.000 | 219.792 |
| domain-burst | local5 | 93.73% | 3.34% | n/a | n/a | 186.000 | 0.000 | 0.000 | 0.000 | 209.644 |
| domain-burst | diverse3 | 99.42% | 0.14% | n/a | n/a | 114.000 | 72.000 | 3.735 | 0.000 | 236.323 |
| domain-burst | local-first5 | 93.69% | 3.37% | n/a | n/a | 186.000 | 72.000 | 1.274 | 0.000 | 205.172 |
| domain-burst | context-gate5 | 91.83% | 2.23% | n/a | n/a | 186.000 | 72.000 | 1.274 | 0.925 | 202.316 |

## Limits and next gate

Local-majority preservation is an invariant by design, not learned ethics. No method can disambiguate locally identical observations generated by local rule changes versus correlated local faults without additional independent evidence or assumptions. Keep negative results, test same-target measurements and prospective fault-domain validation before stronger fusion. Voluntary exchange should be a separate consent-and-conservation experiment; no inference policy authorizes actions on other agents.
