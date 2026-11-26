# Φ019 — Computational Lineage and Ancestral Recall

Standalone synthetic successor to Φ018, earlier experiments unchanged. Tests whether historical configurations reduce search work, not whether they establish identity, consciousness, general intelligence, or live Pocket Mesh integration.

## Protocol

90 paired seeds, one calibration epoch (-1), 24 evaluated epochs. Same weighted nearest-neighbor mechanism and labeled memory/18 probes/18 confirmation/36 held-out queries per epoch as Φ018. Memory is freshly labeled each epoch; this optimistic assumption persists. Five regimes: stationary; recurring axis changes at 6,12,18; offset recurring at 5,13,19; novel regime (swap at 6, both contexts x at 12); noisy probes (25% expected corruption at epochs 6–17). No regime identity or epoch-specific axis supplied to selectors; only scheduled search time and scores. Distinct seeded streams, finite tuples can overlap.

Fixed never searches. Triggered uses Φ018-style alarm or six-epoch schedule and exhaustive 9-pair search. Recall-first searches archived distinct configurations first, excluding incumbent, and selects the best candidate beating incumbent by >=2 probes with no per-context probe regression; if none qualifies, full search. Recall-only uses full search at calibration, never later, isolating the risk of insufficient diversity. All adaptive policies search at calibration. Incumbent tie priority then stable enumeration. All policies cache identical per-epoch probe evaluations, including reference/incumbent; this differs from Φ018 accounting, so compare within Φ019 only. Exactly one selected candidate may receive independent confirmation; no retry after failed confirmation. Requires >=2 additional correct versus incumbent and no per-context regression versus incumbent or baseline. Same confirmation data across policies; acquisition effort not measured, comparison effort is.

Each accepted shadow configuration creates a new immutable-by-convention lineage record (sequential ID, previous node parent, optional recall source ID, epoch, weights). Archive contains at most three distinct configurations ordered by most recent acceptance, including current shadow. Evicted configs remain in the finite trace but cannot be selected by recall. Recalling creates a new node, not history rewrite. Full search may rediscover an evicted config. Active deployment stays [4,4], authority NONE; no executable modification, privilege or automatic deployment. Rejected candidates remain in trace. Test outputs never influence selection. No cryptographic authentication, independent process, durable storage or actual graph branch execution. The historical ancestry graph is a chain with additional recall edges, not yet a general branching mesh.

## Reproduce

    node experiments/phi019-ancestral-recall.mjs test
    node experiments/phi019-ancestral-recall.mjs report 90

Authoring JS runtime: 12443 assertions passed. Return accuracy covers epochs >=12 (recurrent) or >=13 (offset recurrent), including later changes. Full and recall counts include calibration. Below-fixed counts are seed-epoch pairs (max 2160). Comparison count includes unique probe scoring, candidate confirmation and both held-out evaluations; archive bookkeeping, labeled acquisition, memory and wall time are not charged. No statistical inference.

| Regime | Policy | Accuracy | Return accuracy | Mean comparisons | Mean full searches | Accepted recalls | Evictions | Below fixed |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| stationary | fixed | 88.03% | n/a | 58806 | 0.00 | 0 | 0 | 0 |
| stationary | triggered | 97.21% | n/a | 89413 | 5.12 | 0 | 0 | 34 |
| stationary | recall-first | 97.21% | n/a | 89165 | 5.06 | 0 | 0 | 34 |
| stationary | recall-only | 93.11% | n/a | 69595 | 1.00 | 0 | 0 | 17 |
| recurrent | fixed | 87.99% | 88.11% | 58806 | 0.00 | 0 | 0 | 0 |
| recurrent | triggered | 95.97% | 96.47% | 92680 | 5.16 | 0 | 57 | 31 |
| recurrent | recall-first | 92.11% | 91.80% | 81005 | 3.46 | 141 | 0 | 11 |
| recurrent | recall-only | 89.65% | 88.70% | 66965 | 1.00 | 70 | 0 | 3 |
| offset-recurrent | fixed | 87.99% | 88.15% | 58806 | 0.00 | 0 | 0 | 0 |
| offset-recurrent | triggered | 95.94% | 96.46% | 102616 | 7.76 | 0 | 69 | 35 |
| offset-recurrent | recall-first | 92.75% | 92.17% | 89116 | 4.94 | 189 | 3 | 14 |
| offset-recurrent | recall-only | 89.22% | 88.38% | 66879 | 1.00 | 74 | 0 | 3 |
| novel | fixed | 88.06% | n/a | 58806 | 0.00 | 0 | 0 | 0 |
| novel | triggered | 95.15% | n/a | 92189 | 5.30 | 0 | 70 | 39 |
| novel | recall-first | 92.82% | n/a | 85120 | 4.41 | 68 | 4 | 16 |
| novel | recall-only | 89.43% | n/a | 66404 | 1.00 | 46 | 0 | 3 |
| probe-noise | fixed | 88.03% | n/a | 58806 | 0.00 | 0 | 0 | 0 |
| probe-noise | triggered | 97.47% | n/a | 102924 | 8.50 | 0 | 0 | 35 |
| probe-noise | recall-first | 97.47% | n/a | 102314 | 8.32 | 0 | 0 | 35 |
| probe-noise | recall-only | 93.11% | n/a | 69628 | 1.00 | 0 | 0 | 17 |

Replay recomputes complete trace and rejects inconsistencies, but cannot authenticate a consistent rewritten trace. Archive size and thresholds are author choices, not optimized. Future: persistent authenticated lineage, delayed labels and stale memory, larger candidate spaces, stronger cache/retrieval baselines, observation costs and uncertainty estimates before external integration.
