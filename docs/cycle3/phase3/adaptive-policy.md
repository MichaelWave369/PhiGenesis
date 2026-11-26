# Φ042 — Adaptive policy selection with delayed probe feedback

Research-only continuation of merged #51. Three fixed arms from actual temporal module: recent, prior-fallback, fresh-vote. Six policies (three fixed, round-robin, full-feedback, selected-feedback), four unchanged Φ030 synthetic regimes, two feedback delays (1/3 epochs), 90 paired seeds, 24 epochs, 36 held-out predictions per epoch (3,732,480 policy-query evaluations). Common recent-72 pool. Test fixtures identical to Φ030; 18 separate probe queries per epoch from different deterministic seed constant, possible tuple overlap. Choices committed before current fixtures generated; selector receives only past probe correct counts after simulated delivery, exact receipt fields, no oracle regime or current test labels. Feedback is trusted simulator output, not independently verified or authenticated, and is never added to memory. Test results do not enter selector. Full-feedback probes all three arms each epoch, selected-feedback only chosen arm; selected arm explores every fourth epoch in round-robin order. Rolling six-generation window, pseudocount 9/18, replace leader only if score exceeds current by >1 correct per 18-query equivalent; ties favor earlier arm order. No optimization after results. Fixed baselines need no probe. Fixed rotation has no feedback. Full feedback assumes labeled probes available after exact delay, no missing/corrupted feedback. No production learning, deployment or authority.

Report actual logical distance comparisons (test and probe separately), inference scans, probe evaluations, delivered feedback, switches, choices, coverage, early transition accuracy and paired deltas against prior-fallback. Simulation reuses shared fixed-arm test computation for scoring; per-policy counters are attributed logical work, not measured process CPU cost. Inference scans represent required passes, not all host computations. No matched total compute or general superiority claim. Baseline recent checked each epoch; all three fixed arms checked against actual prior trial for seed 7 across regimes/delays. All task families are internal and prior results known. No independent scientific evaluation. Authoring V8 executed actual fetched native modules with 272 assertions passed. Node CI pending.

| Regime | Feedback delay | Policy | Accuracy % | Early switch % | Total comparisons/trial | Inference scans/trial |
|---|---:|---|---:|---:|---:|---:|
| stationary | 1 | recent | 80.15 | n/a | 17569 | 0 |
| stationary | 1 | prior-fallback | 79.93 | n/a | 17191 | 1464 |
| stationary | 1 | fresh-vote | 79.93 | n/a | 17190 | 2928 |
| stationary | 1 | rotation | 79.99 | n/a | 17314 | 1512 |
| stationary | 1 | full-feedback | 80.15 | n/a | 43544 | 2928 |
| stationary | 1 | selected-feedback | 79.95 | n/a | 25868 | 1626 |
| stationary | 3 | recent | 80.15 | n/a | 17569 | 0 |
| stationary | 3 | prior-fallback | 79.93 | n/a | 17191 | 1464 |
| stationary | 3 | fresh-vote | 79.93 | n/a | 17190 | 2928 |
| stationary | 3 | rotation | 79.99 | n/a | 17314 | 1512 |
| stationary | 3 | full-feedback | 80.15 | n/a | 43544 | 2928 |
| stationary | 3 | selected-feedback | 80.04 | n/a | 25912 | 1300 |
| recurrent | 1 | recent | 57.98 | 40.71 | 17569 | 0 |
| recurrent | 1 | prior-fallback | 61.75 | 43.86 | 12562 | 1464 |
| recurrent | 1 | fresh-vote | 61.50 | 43.21 | 12621 | 2928 |
| recurrent | 1 | rotation | 60.23 | 43.70 | 14149 | 1512 |
| recurrent | 1 | full-feedback | 58.92 | 41.41 | 37861 | 2928 |
| recurrent | 1 | selected-feedback | 61.61 | 43.75 | 19113 | 1687 |
| recurrent | 3 | recent | 57.98 | 40.71 | 17569 | 0 |
| recurrent | 3 | prior-fallback | 61.75 | 43.86 | 12562 | 1464 |
| recurrent | 3 | fresh-vote | 61.50 | 43.21 | 12621 | 2928 |
| recurrent | 3 | rotation | 60.23 | 43.70 | 14149 | 1512 |
| recurrent | 3 | full-feedback | 58.74 | 42.08 | 37890 | 2928 |
| recurrent | 3 | selected-feedback | 60.77 | 43.31 | 20814 | 1311 |
| delayed | 1 | recent | 44.11 | 39.49 | 15698 | 0 |
| delayed | 1 | prior-fallback | 45.06 | 33.76 | 8985 | 1308 |
| delayed | 1 | fresh-vote | 45.52 | 34.97 | 8480 | 2616 |
| delayed | 1 | rotation | 46.30 | 37.96 | 11163 | 1358 |
| delayed | 1 | full-feedback | 44.33 | 38.68 | 31516 | 2616 |
| delayed | 1 | selected-feedback | 45.41 | 37.41 | 16637 | 1079 |
| delayed | 3 | recent | 44.11 | 39.49 | 15698 | 0 |
| delayed | 3 | prior-fallback | 45.06 | 33.76 | 8985 | 1308 |
| delayed | 3 | fresh-vote | 45.52 | 34.97 | 8480 | 2616 |
| delayed | 3 | rotation | 46.30 | 37.96 | 11163 | 1358 |
| delayed | 3 | full-feedback | 43.99 | 38.70 | 31628 | 2616 |
| delayed | 3 | selected-feedback | 44.28 | 38.00 | 19518 | 781 |
| contradictory | 1 | recent | 50.22 | 38.96 | 17554 | 0 |
| contradictory | 1 | prior-fallback | 52.92 | 41.03 | 12104 | 1463 |
| contradictory | 1 | fresh-vote | 52.61 | 40.16 | 12172 | 2926 |
| contradictory | 1 | rotation | 51.81 | 40.97 | 13948 | 1511 |
| contradictory | 1 | full-feedback | 50.70 | 39.26 | 37752 | 2926 |
| contradictory | 1 | selected-feedback | 52.33 | 40.79 | 20133 | 1387 |
| contradictory | 3 | recent | 50.22 | 38.96 | 17554 | 0 |
| contradictory | 3 | prior-fallback | 52.92 | 41.03 | 12104 | 1463 |
| contradictory | 3 | fresh-vote | 52.61 | 40.16 | 12172 | 2926 |
| contradictory | 3 | rotation | 51.81 | 40.97 | 13948 | 1511 |
| contradictory | 3 | full-feedback | 50.65 | 39.68 | 37605 | 2926 |
| contradictory | 3 | selected-feedback | 51.81 | 40.60 | 21574 | 1076 |

Reproduce: node experiments/phi042-adaptive-policy.mjs test; node experiments/phi042-adaptive-policy.mjs. CI verifies deterministic full output. No modifications to earlier experiments, native runtime or external repositories. Production BLOCKED.
