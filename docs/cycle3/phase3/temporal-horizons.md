# Φ042 — Temporal context and evidence horizons

Research extension of merged #50, reuses actual Φ030 run/step and prior inference. All policies use identical recent-72 delivered memory, Manhattan distance and tie break. Native recent counts verified every epoch; prior-fallback counts checked against actual #50 on every paired seed/regime. 90 seeds, 24 epochs, 36 queries, 4 regimes, 6 policies (1,866,240 primary query-policy evaluations, excluding repeated baseline checks). Fixed hypotheses authored with prior benchmark known, no independent holdout. No context schedule/true phase supplied to inference; generation timestamp and current epoch are available. Arrival is implicit by membership in delivered memory; arrival timestamp is not an inference input. Two known axis mappings; no general context discovery.

Policies: recent, prior fallback unchanged, horizon-2/3 (expire prior tag when latest delivered generation is older than 2/3 epochs; use ordinary recent retrieval if unavailable), fresh-vote (only observations generated in last 3 epochs; weights 3/2/1, at least three informative observations and absolute weighted margin >=2, else fallback), dual-agree (fresh-vote chooses one hypothesis if available, otherwise answer only if both inferred historical groups have a nonempty matching nearest-neighbor prediction; no fallback). Dual computes both rankings even if tag known, counted. Generation cohort tags remain prior inference's labels. No direct rule-based predictions. Inferred group membership is not truth; agreement is not independent evidence. No tuning after measurements. Report all regimes, coverage and conditional accuracy, early change accuracy (first three epochs after each change), context coverage/accuracy, stale estimates, false answers, pairwise wins/ties/losses vs prior-fallback. Costs separate distance comparisons and inference row scans; overhead excluded, no matched total-compute claim. Some hypotheses discard useful older records; do not promote on positive results.

Authoring V8 execution against exact fetched previous modules: 105 checks passed. Actual Node CI not yet confirmed. Source and prior research unchanged. Production BLOCKED.

| Regime | Policy | Accuracy % | Coverage % | Early change % | Comparisons/trial | Inference scans/trial |
|---|---|---:|---:|---:|---:|---:|
| stationary | recent | 80.15 | 95.40 | n/a | 17569 | 0 |
| stationary | prior-fallback | 79.93 | 95.40 | n/a | 17191 | 1464 |
| stationary | horizon-2 | 79.93 | 95.40 | n/a | 17191 | 1464 |
| stationary | horizon-3 | 79.93 | 95.40 | n/a | 17191 | 1464 |
| stationary | fresh-vote | 79.93 | 95.40 | n/a | 17190 | 2928 |
| stationary | dual-agree | 79.65 | 94.80 | n/a | 17181 | 2928 |
| recurrent | recent | 57.98 | 95.40 | 40.71 | 17569 | 0 |
| recurrent | prior-fallback | 61.75 | 95.40 | 43.86 | 12562 | 1464 |
| recurrent | horizon-2 | 61.75 | 95.40 | 43.86 | 12562 | 1464 |
| recurrent | horizon-3 | 61.75 | 95.40 | 43.86 | 12562 | 1464 |
| recurrent | fresh-vote | 61.50 | 95.40 | 43.21 | 12621 | 2928 |
| recurrent | dual-agree | 61.07 | 94.41 | 42.79 | 17181 | 2928 |
| delayed | recent | 44.11 | 90.19 | 39.49 | 15698 | 0 |
| delayed | prior-fallback | 45.06 | 90.19 | 33.76 | 8985 | 1308 |
| delayed | horizon-2 | 45.06 | 90.19 | 34.00 | 9187 | 1308 |
| delayed | horizon-3 | 45.06 | 90.19 | 33.76 | 8985 | 1308 |
| delayed | fresh-vote | 45.52 | 90.19 | 34.97 | 8480 | 2616 |
| delayed | dual-agree | 41.51 | 79.94 | 29.57 | 14937 | 2616 |
| contradictory | recent | 50.22 | 95.57 | 38.96 | 17554 | 0 |
| contradictory | prior-fallback | 52.92 | 95.57 | 41.03 | 12104 | 1463 |
| contradictory | horizon-2 | 52.92 | 95.57 | 41.03 | 12104 | 1463 |
| contradictory | horizon-3 | 52.92 | 95.57 | 41.03 | 12104 | 1463 |
| contradictory | fresh-vote | 52.61 | 95.57 | 40.16 | 12172 | 2926 |
| contradictory | dual-agree | 51.64 | 93.00 | 38.92 | 16485 | 2926 |

Reproduce: node experiments/phi042-temporal-horizons.mjs test; node experiments/phi042-temporal-horizons.mjs. CI repeats full report and byte compares. No native memory adapter change, independent evaluation, runtime authority or witness deployment.
