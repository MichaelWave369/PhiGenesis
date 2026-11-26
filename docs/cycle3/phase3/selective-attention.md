# Φ042 — Selective computational attention

Research continuation of merged #52. Actual previous adaptive trial provides all six unchanged baselines; three new policies start from prior-fallback, not the previous selectors' recent default. Shared recent-72 delivered pool, same 18 probe and 36 test query generators; possible tuple overlap. Nine policies, 90 paired seeds, four regimes, delays 1/3, 24 epochs (5,598,720 primary policy-query evaluations). Internal synthetic feedback is not independently authenticated. Selection and audit plan precede current fixture creation; only past delivered probe scores and delivered context metadata enter decisions. Fixed 24 arm-batch cap (432 probe predictions); each audit reserves 3 batches before scoring, each monitor 1. No probe launched if its feedback cannot arrive within session. Periodic audit every third epoch starting at 1. Score trigger monitors every third epoch, alarms on <=9/18 or a drop >=4 versus last same-arm monitor; context trigger additionally alarms on change between known inferred tags. Alarms persist until audit, at most one outstanding audit; a monitor may run while audit pending. Paired audit compares three arms on the same probe set, switches only with >=2 correct advantage; expired feedback (>6 generation epochs) cannot switch. Reset monitor score on review. No online tuning; these are chosen research heuristics with earlier results known.

Report accuracy, coverage, early transition accuracy, probe work, audits/monitors, switches, scans and paired deltas against prior fallback. New policies share a cap, not equal actual resource expenditure; old baselines have no new cap and may spend on undeliverable final probes. A common incumbent differs from previous adaptive bootstrap, so differences are not isolated solely to probe timing. Costs are attributed logical distance comparisons and inference passes, not total measured CPU cost; host precomputes both inference passes for simulation. No independent held-out family or superiority claim. Negative outcomes retained. Authoring V8 actually executed fetched existing modules and new code: 155 assertions passed. Native Node CI pending.

| Regime | Delay | Policy | Accuracy % | Early % | Comparisons/trial | Probe predictions | Audits | Inference scans |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| stationary | 1 | recent | 80.15 | n/a | 17569 | 0 | 0.00 | 0 |
| stationary | 1 | prior-fallback | 79.93 | n/a | 17191 | 0 | 0.00 | 1464 |
| stationary | 1 | fresh-vote | 79.93 | n/a | 17190 | 0 | 0.00 | 2928 |
| stationary | 1 | rotation | 79.99 | n/a | 17314 | 0 | 0.00 | 1512 |
| stationary | 1 | full-feedback | 80.15 | n/a | 43544 | 1296 | 0.00 | 2928 |
| stationary | 1 | selected-feedback | 79.95 | n/a | 25868 | 432 | 0.00 | 1626 |
| stationary | 1 | periodic-audit | 79.93 | n/a | 25828 | 432 | 8.00 | 1922 |
| stationary | 1 | score-trigger | 79.94 | n/a | 20759 | 206 | 1.16 | 1359 |
| stationary | 1 | context-trigger | 79.94 | n/a | 20759 | 206 | 1.16 | 1502 |
| stationary | 3 | recent | 80.15 | n/a | 17569 | 0 | 0.00 | 0 |
| stationary | 3 | prior-fallback | 79.93 | n/a | 17191 | 0 | 0.00 | 1464 |
| stationary | 3 | fresh-vote | 79.93 | n/a | 17190 | 0 | 0.00 | 2928 |
| stationary | 3 | rotation | 79.99 | n/a | 17314 | 0 | 0.00 | 1512 |
| stationary | 3 | full-feedback | 80.15 | n/a | 43544 | 1296 | 0.00 | 2928 |
| stationary | 3 | selected-feedback | 80.04 | n/a | 25912 | 432 | 0.00 | 1300 |
| stationary | 3 | periodic-audit | 79.92 | n/a | 24547 | 378 | 7.00 | 1854 |
| stationary | 3 | score-trigger | 79.93 | n/a | 20300 | 164 | 1.04 | 1521 |
| stationary | 3 | context-trigger | 79.93 | n/a | 20300 | 164 | 1.04 | 1521 |
| recurrent | 1 | recent | 57.98 | 40.71 | 17569 | 0 | 0.00 | 0 |
| recurrent | 1 | prior-fallback | 61.75 | 43.86 | 12562 | 0 | 0.00 | 1464 |
| recurrent | 1 | fresh-vote | 61.50 | 43.21 | 12621 | 0 | 0.00 | 2928 |
| recurrent | 1 | rotation | 60.23 | 43.70 | 14149 | 0 | 0.00 | 1512 |
| recurrent | 1 | full-feedback | 58.92 | 41.41 | 37861 | 1296 | 0.00 | 2928 |
| recurrent | 1 | selected-feedback | 61.61 | 43.75 | 19113 | 432 | 0.00 | 1687 |
| recurrent | 1 | periodic-audit | 60.19 | 42.31 | 21879 | 432 | 8.00 | 1714 |
| recurrent | 1 | score-trigger | 61.38 | 43.63 | 17644 | 347 | 3.76 | 1547 |
| recurrent | 1 | context-trigger | 61.38 | 43.60 | 17653 | 347 | 3.80 | 1693 |
| recurrent | 3 | recent | 57.98 | 40.71 | 17569 | 0 | 0.00 | 0 |
| recurrent | 3 | prior-fallback | 61.75 | 43.86 | 12562 | 0 | 0.00 | 1464 |
| recurrent | 3 | fresh-vote | 61.50 | 43.21 | 12621 | 0 | 0.00 | 2928 |
| recurrent | 3 | rotation | 60.23 | 43.70 | 14149 | 0 | 0.00 | 1512 |
| recurrent | 3 | full-feedback | 58.74 | 42.08 | 37890 | 1296 | 0.00 | 2928 |
| recurrent | 3 | selected-feedback | 60.77 | 43.31 | 20814 | 432 | 0.00 | 1311 |
| recurrent | 3 | periodic-audit | 60.85 | 43.34 | 20118 | 378 | 7.00 | 1662 |
| recurrent | 3 | score-trigger | 61.70 | 43.80 | 16499 | 222 | 2.67 | 1626 |
| recurrent | 3 | context-trigger | 61.47 | 43.69 | 19535 | 415 | 5.62 | 1850 |
| delayed | 1 | recent | 44.11 | 39.49 | 15698 | 0 | 0.00 | 0 |
| delayed | 1 | prior-fallback | 45.06 | 33.76 | 8985 | 0 | 0.00 | 1308 |
| delayed | 1 | fresh-vote | 45.52 | 34.97 | 8480 | 0 | 0.00 | 2616 |
| delayed | 1 | rotation | 46.30 | 37.96 | 11163 | 0 | 0.00 | 1358 |
| delayed | 1 | full-feedback | 44.33 | 38.68 | 31516 | 1296 | 0.00 | 2616 |
| delayed | 1 | selected-feedback | 45.41 | 37.41 | 16637 | 432 | 0.00 | 1079 |
| delayed | 1 | periodic-audit | 44.54 | 34.95 | 16559 | 432 | 8.00 | 1492 |
| delayed | 1 | score-trigger | 44.73 | 34.50 | 15414 | 384 | 4.44 | 1518 |
| delayed | 1 | context-trigger | 44.64 | 34.74 | 15883 | 424 | 5.57 | 1710 |
| delayed | 3 | recent | 44.11 | 39.49 | 15698 | 0 | 0.00 | 0 |
| delayed | 3 | prior-fallback | 45.06 | 33.76 | 8985 | 0 | 0.00 | 1308 |
| delayed | 3 | fresh-vote | 45.52 | 34.97 | 8480 | 0 | 0.00 | 2616 |
| delayed | 3 | rotation | 46.30 | 37.96 | 11163 | 0 | 0.00 | 1358 |
| delayed | 3 | full-feedback | 43.99 | 38.70 | 31628 | 1296 | 0.00 | 2616 |
| delayed | 3 | selected-feedback | 44.28 | 38.00 | 19518 | 432 | 0.00 | 781 |
| delayed | 3 | periodic-audit | 44.36 | 35.22 | 15816 | 378 | 7.00 | 1425 |
| delayed | 3 | score-trigger | 44.84 | 34.61 | 12587 | 231 | 2.92 | 1303 |
| delayed | 3 | context-trigger | 44.07 | 35.63 | 16683 | 348 | 4.53 | 1580 |
| contradictory | 1 | recent | 50.22 | 38.96 | 17554 | 0 | 0.00 | 0 |
| contradictory | 1 | prior-fallback | 52.92 | 41.03 | 12104 | 0 | 0.00 | 1463 |
| contradictory | 1 | fresh-vote | 52.61 | 40.16 | 12172 | 0 | 0.00 | 2926 |
| contradictory | 1 | rotation | 51.81 | 40.97 | 13948 | 0 | 0.00 | 1511 |
| contradictory | 1 | full-feedback | 50.70 | 39.26 | 37752 | 1296 | 0.00 | 2926 |
| contradictory | 1 | selected-feedback | 52.33 | 40.79 | 20133 | 432 | 0.00 | 1387 |
| contradictory | 1 | periodic-audit | 52.24 | 40.39 | 20731 | 432 | 8.00 | 1784 |
| contradictory | 1 | score-trigger | 52.52 | 40.71 | 17727 | 354 | 3.89 | 1516 |
| contradictory | 1 | context-trigger | 52.45 | 40.61 | 17985 | 363 | 4.14 | 1722 |
| contradictory | 3 | recent | 50.22 | 38.96 | 17554 | 0 | 0.00 | 0 |
| contradictory | 3 | prior-fallback | 52.92 | 41.03 | 12104 | 0 | 0.00 | 1463 |
| contradictory | 3 | fresh-vote | 52.61 | 40.16 | 12172 | 0 | 0.00 | 2926 |
| contradictory | 3 | rotation | 51.81 | 40.97 | 13948 | 0 | 0.00 | 1511 |
| contradictory | 3 | full-feedback | 50.65 | 39.68 | 37605 | 1296 | 0.00 | 2926 |
| contradictory | 3 | selected-feedback | 51.81 | 40.60 | 21574 | 432 | 0.00 | 1076 |
| contradictory | 3 | periodic-audit | 52.47 | 40.70 | 19404 | 378 | 7.00 | 1725 |
| contradictory | 3 | score-trigger | 52.74 | 40.90 | 16205 | 221 | 2.64 | 1569 |
| contradictory | 3 | context-trigger | 52.60 | 40.79 | 19273 | 404 | 5.49 | 1853 |

Reproduce: node experiments/phi042-selective-attention.mjs test; node experiments/phi042-selective-attention.mjs. CI repeats full output, checks deterministic reproduction. No modification of earlier experiments, runtime, policy authority or external repos. Production BLOCKED.
