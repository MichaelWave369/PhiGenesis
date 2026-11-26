# Φ021 — Collaborative Evolution

Standalone successor to Φ020. Three simulated independent peer learners each discover one context weight; a recipient can import their records and assemble a candidate. No live Agentora, network, executable self-modification, privilege escalation or production promotion.

## Protocol

90 paired seeds. Each peer independently explores three weights on 12 probes with 24 labeled memories, chooses the first best and confirms on 12 separate observations. A record is issued only if confirmation beats fixed weight 4 by >=1 correct. All source comparisons charged, including refused records. Target has three contexts, or four for coupled. Fresh 24 memories, 12 probes, 12 confirmation and 18 held-out queries per context. Target aligned axes [8,0,8], partial drift [8,8,4], coupled aligned plus parity interaction (even number of 8 weights -> x, odd -> y; shared label uses y), altered-transfer aligned with peer 1 record weight modified in transit. Distinct deterministic seed streams for peers and target, finite tuples may overlap. Same target fixtures across policies. No target axes supplied to selector.

Fixed, local-factorized (three weights independently scored per context), local-exhaustive (27 full configs), peer-only (compose received weights with default 4 for missing records), peer-fallback (if suggestion misses >2 probes or fewer than three valid records, additionally evaluate local-factorized). All select by full target probe score against fixed, ties favor incumbent. Confirmation requires >=2 more correct than fixed and no per-context regression; otherwise retain fixed. Held-out results excluded from selection. Candidate remains shadow only, active fixed and authority NONE. No claim of independently enforced security. Transfer checks exact plain-record equality against trusted simulator-issued record; simulated tampering rejected, but a consistently forged registry, malicious peer and real network/authentication are untested. Payload bytes count ASCII compact JSON only, not transport or registry exchange. No actual interprocess calls.

Cost scopes: target-only comparisons, full target-discovery comparisons (charge all three source acquisitions only to sharing policies), fleet comparisons (charge all three source acquisitions to every policy as if peers are independently required tasks). Sources computed for paired analysis in all runs; target-local decisions do not consume source records. Counts include candidate search, monitoring, confirmation and both held-out evaluations. No acquisition cost for obtaining labels, CPU wall time or memory costs measured. Separate units for comparison count and payload bytes, no arbitrary conversion. No statistical inference. Local-factorized is a strong baseline because context factorization is supplied. Coupled regime designed, not emergent. Fresh labels and perfect context identity are optimistic.

## Reproduce

    node experiments/phi021-collaborative-evolution.mjs test
    node experiments/phi021-collaborative-evolution.mjs report 90

Authoring JS runtime: 889 assertions passed.

| Regime | Policy | Accuracy | Target comparisons | Full discovery | Fleet | Mean payload bytes | Accepted | Rejected | Fallbacks |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aligned | fixed | 87.18% | 5184 | 5184 | 9504 | 0.0 | 0 | 0 | 0 |
| aligned | local-factorized | 95.82% | 8640 | 8640 | 12960 | 0.0 | 0 | 0 | 0 |
| aligned | local-exhaustive | 95.82% | 27648 | 27648 | 31968 | 0.0 | 0 | 0 | 0 |
| aligned | peer-only | 93.07% | 5990 | 10310 | 10310 | 126.6 | 159 | 0 | 0 |
| aligned | peer-fallback | 96.23% | 8765 | 13085 | 13085 | 126.6 | 159 | 0 | 75 |
| partial-drift | fixed | 87.59% | 5184 | 5184 | 9504 | 0.0 | 0 | 0 | 0 |
| partial-drift | local-factorized | 91.54% | 8582 | 8582 | 12902 | 0.0 | 0 | 0 | 0 |
| partial-drift | local-exhaustive | 91.54% | 27648 | 27648 | 31968 | 0.0 | 0 | 0 | 0 |
| partial-drift | peer-only | 87.63% | 5990 | 10310 | 10310 | 126.6 | 159 | 0 | 0 |
| partial-drift | peer-fallback | 91.54% | 9379 | 13699 | 13699 | 126.6 | 159 | 0 | 90 |
| coupled | fixed | 73.83% | 6912 | 6912 | 11232 | 0.0 | 0 | 0 | 0 |
| coupled | local-factorized | 88.67% | 10656 | 10656 | 14976 | 0.0 | 0 | 0 | 0 |
| coupled | local-exhaustive | 95.88% | 36864 | 36864 | 41184 | 0.0 | 0 | 0 | 0 |
| coupled | peer-only | 87.56% | 7987 | 12307 | 12307 | 126.6 | 159 | 0 | 0 |
| coupled | peer-fallback | 92.52% | 11539 | 15859 | 15859 | 126.6 | 159 | 0 | 90 |
| altered-transfer | fixed | 87.18% | 5184 | 5184 | 9504 | 0.0 | 0 | 0 | 0 |
| altered-transfer | local-factorized | 95.82% | 8640 | 8640 | 12960 | 0.0 | 0 | 0 | 0 |
| altered-transfer | local-exhaustive | 95.82% | 27648 | 27648 | 31968 | 0.0 | 0 | 0 | 0 |
| altered-transfer | peer-only | 89.71% | 5914 | 10234 | 10234 | 126.6 | 97 | 62 | 0 |
| altered-transfer | peer-fallback | 95.66% | 9360 | 13680 | 13680 | 126.6 | 97 | 62 | 90 |

Replay recomputes the trace and does not authenticate it. Further work should evaluate amortization across multiple recipient tasks, stale labels, independent processes, authenticated receipts, incompatible coordinate systems, interaction-aware search, and real interfaces before integration. No general intelligence or production readiness claim.
