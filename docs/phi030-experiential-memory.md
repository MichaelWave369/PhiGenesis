# Φ030 — Persistent experiential memory (pilot)

Standalone successor to Φ029, no changes to prior governance or witness formats. Four retention/retrieval strategies on 90 paired seeds, 24 epochs, 36 clean evaluation queries per epoch. Each epoch emits 18 observations across three contexts. Labels arrive after 1–3 epochs (2–5 delayed regime), or are permanently missing (10% probability, 30% delayed); contradictory regime corrupts 20% expected observed labels. Stationary fixed axes; other regimes reverse axes every six epochs. No immediate label access in retrieval. Simulator transport stores pending labels privately by convention; not a security boundary. Evaluation labels never enter memory. Distinct deterministic streams, individual tuples may overlap.

Recent: newest 72 delivered observations by generation epoch. Age-weighted: same memory plus 0.75 per epoch penalty in Manhattan retrieval. Consolidated: same retention, majority vote among equal-distance nearest examples, abstain on ties (not durable compaction). Context-tagged: at most 36 records per observed environmental tag, retrieves current tag only; supplied tag is a strong side-information assumption, not inferred by learner. All use same fixed Manhattan geometry and total capacity bound; stationary tag policy uses only half capacity. Missing and abstained predictions count as incorrect in overall accuracy; conditional accuracy and coverage reported separately. Return accuracy covers epochs 12–23 (includes both phases). Stale count means all closest examples came from a different tag. Comparison count includes retrieval only, not storage, sorting, generator or verification. No significance estimates. Seeded simulated observations, not real data or general intelligence.

## Reproduce

    node experiments/phi030-cli.mjs test
    node experiments/phi030-cli.mjs report 90
    node experiments/phi030-restart-test.mjs

Authoring runtime: 4946 assertions passed; 1440 simulated trials, 34560 epochs. Actual results:

| Regime | Policy | Accuracy | Coverage | Conditional accuracy | Return accuracy | Mean comparisons |
|---|---|---:|---:|---:|---:|---:|
| stationary | recent | 80.15% | 95.40% | 84.01% | 87.30% | 17569 |
| stationary | age-weighted | 75.39% | 95.40% | 79.02% | 81.32% | 17569 |
| stationary | consolidated | 77.86% | 89.48% | 87.01% | 84.89% | 17569 |
| stationary | context-tagged | 73.15% | 95.40% | 76.68% | 78.72% | 9293 |
| recurrent | recent | 57.98% | 95.40% | 60.77% | 57.61% | 17569 |
| recurrent | age-weighted | 60.28% | 95.40% | 63.19% | 61.05% | 17569 |
| recurrent | consolidated | 51.80% | 86.51% | 59.87% | 50.05% | 17569 |
| recurrent | context-tagged | 67.77% | 90.80% | 74.63% | 78.82% | 8219 |
| delayed | recent | 44.11% | 90.19% | 48.91% | 47.68% | 15698 |
| delayed | age-weighted | 46.04% | 90.19% | 51.06% | 49.16% | 15698 |
| delayed | consolidated | 39.14% | 81.30% | 48.15% | 41.89% | 15698 |
| delayed | context-tagged | 58.16% | 80.63% | 72.14% | 79.12% | 6679 |
| contradictory | recent | 50.22% | 95.57% | 52.55% | 50.74% | 17554 |
| contradictory | age-weighted | 52.14% | 95.57% | 54.55% | 53.50% | 17554 |
| contradictory | consolidated | 43.61% | 82.03% | 53.17% | 42.81% | 17554 |
| contradictory | context-tagged | 56.64% | 90.91% | 62.31% | 65.28% | 8194 |

Snapshot CLI uses file fsync, atomic rename and directory fsync; cold restart reconstructs exact deterministic expected prefix before continuing. Pending simulator transport, memory, counters and epoch retained. Single trusted writer, no authentication, external latest pin, crash injection, power-loss guarantee, file-size guard or independent security enforcement. Deterministic replay can reject inconsistent edits but not a consistently regenerated alternative history. Initialization can replace an existing snapshot; use a new path. Node restart harness awaits CI verification. No automatic promotion, external adapters or live PhiMemory9 integration.

Next: authenticated observations with delayed labels and typed memory references in Altermath; replace simulator-only pending transport with explicit evidence receipts, bind storage to witnessed journal and include memory costs in accounting.
