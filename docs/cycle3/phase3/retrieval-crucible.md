# Φ042 increment — native retrieval abstention crucible

Research-only extension after merged Phase II. Reuse pinned PhiMemory9 R0.5 native benchmark and all four methods/thresholds. No modifications to memory intake, session protocols, evaluator or external repos. Native sparse history discards out-of-vocabulary (OOV) query words before normalizing, which can inflate similarity for unsupported queries. Candidate full_norm includes OOV words with smoothed zero-DF IDF in query norm only; candidate agreement intersects native top-three ancestry and sparse-history results, preserving sparse order. Both use original 0.48 sparse threshold; ancestry uses original 0.55 threshold. No threshold tuning, no claims of independent corroboration. Both choices were made after seeing the Phase II aggregate and inspecting R0.5 code; R0.5 is retrospective regression, not independent holdout.

Supplemental fixed internal synthetic corpus: six renewed histories, six current documents, six OOV negatives and six mixed known-vocabulary identity negatives. Negative labels mean no single record supplies the requested conjunction; not a truth-verification benchmark. Same tasks, unchanged thresholds, separate results per corpus. Report all queries, top-1/top-3 hits, abstention and negative false acceptance. No seed filtering. New fixture and algorithm authored together, not externally frozen or independent. No statistical significance or general retrieval advantage.

Authoring runtime: JavaScript reimplementation of pinned tokenization/coverage/sparse scoring on fetched R0.5 and supplemental fixtures (not actual Python execution). Results below (history hit@1 / current hit@1 / negative accepts):

r05

| Method | History | Current | Negative accepts |
|---|---:|---:|---:|
| lexical | 0 | 12 | 0 |
| ancestry | 12 | 12 | 0 |
| sparse | 0 | 12 | 0 |
| sparse_history | 12 | 12 | 4 |
| full_norm | 12 | 12 | 0 |
| agreement | 12 | 12 | 0 |

supplemental

| Method | History | Current | Negative accepts |
|---|---:|---:|---:|
| lexical | 0 | 6 | 0 |
| ancestry | 6 | 6 | 0 |
| sparse | 0 | 6 | 0 |
| sparse_history | 6 | 6 | 6 |
| full_norm | 6 | 6 | 5 |
| agreement | 6 | 6 | 0 |

CI runs actual native Python code, compares per-query native baseline rank/abstention with unchanged R0.5, tests empty/OOV/exact queries, repeats output for byte equality. No expected candidate superiority assertion. Actual Python results pending at authoring. Counts do not measure cost; full_norm adds corpus traversal, agreement combines results already produced for benchmarking. Native intake currently uses lexical/ancestry only; do not claim repair of production adapter. No new deployment, permissions, witness independence or release qualification. Production BLOCKED.
