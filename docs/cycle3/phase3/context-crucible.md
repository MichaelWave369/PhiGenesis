# Φ042 increment — context recognition under uncertainty

Internal synthetic experiment using actual unchanged Φ030 step/run. All six policies share the same recent-72 delivered-record pool, nearest Manhattan geometry, tie-break and 36 queries per epoch; this is not a reproduction of the original context-tagged partition policy. The recent baseline checks exact native per-epoch correct/answered/comparison counts. Held-out queries are generated separately using the original fixture algorithm; no current test labels enter the infer function. The host simulates truth and external signals for comparator only. Inference receives exactly six scalar fields (id, generation epoch, fixed subcontext, x, y, arrived label), rejects extra fields including true phase tag. It assumes known two candidate axis-label mappings, uses only informative observations matching one mapping, labels each generation cohort with >=3 informative votes and margin >=2, estimates current tag from latest two observed generation epochs. No clock schedule or oracle tags are passed to inference. Generation epoch is assumed available metadata; delayed arrivals make estimates stale. Tags can be revised as retained evidence changes. This is supervised rule identification, not general unsupervised context discovery.

Policies recent (no tag), oracle (perfect archive and current tags), noisy (20% expected independent per-epoch bit flips shared by current and archive tag), delayed-tag (perfect historical tags, current tag delayed three epochs, absent first three), inferred (unknown tag/cohort means abstention), inferred-fallback (if no matching record, use recent). Missing tags handled explicitly; recent is no-tag baseline. Inference scans counted separately, not interchangeable with comparisons. Common recent retention means no long-term archival improvement claim. Costs omit host simulation and overhead. No statistical significance or independently collected tasks; all worlds and mappings authored. 90 paired seeds, 24 epochs, 36 queries, 4 regimes, 6 policies; 1866240 query-policy evaluations. Early-switch window first three epochs after switches (6,12,18); return metric epochs 12–23. Accuracy counts abstentions as wrong, conditional accuracy reported separately, context accuracy conditional on known tag. Wins/ties/losses vs recent and worst paired delta included in JSON. No tuning against results asserted; rules authored internally with prior Φ030 results known.

Authoring V8 actual fetched native source logic and new experiment: 103 assertions passed. CI repeats native Node execution and byte compares full report. No production or native memory adapter changes; release BLOCKED.

| Regime | Policy | Accuracy % | Coverage % | Context accuracy % (known) | Early switch accuracy % | Mean distance comparisons | Mean inference scans |
|---|---|---:|---:|---:|---:|---:|---:|
| stationary | recent | 80.15 | 95.40 | n/a | n/a | 17568.9 | 0.0 |
| stationary | oracle | 80.15 | 95.40 | 100.00 | n/a | 17568.9 | 0.0 |
| stationary | noisy | 69.66 | 88.63 | 79.63 | n/a | 11849.2 | 0.0 |
| stationary | delayed-tag | 75.73 | 87.50 | 100.00 | n/a | 17307.9 | 0.0 |
| stationary | inferred | 79.61 | 94.75 | 100.00 | n/a | 17173.1 | 1464.1 |
| stationary | inferred-fallback | 79.93 | 95.40 | 100.00 | n/a | 17191.1 | 1464.1 |
| recurrent | recent | 57.98 | 95.40 | n/a | 40.71 | 17568.9 | 0.0 |
| recurrent | oracle | 58.67 | 81.59 | 100.00 | 35.06 | 8040.1 | 0.0 |
| recurrent | noisy | 52.39 | 88.33 | 79.63 | 37.91 | 8467.9 | 0.0 |
| recurrent | delayed-tag | 53.49 | 87.50 | 57.14 | 33.05 | 13978.0 | 0.0 |
| recurrent | inferred | 60.53 | 92.48 | 75.94 | 41.37 | 12074.7 | 1464.1 |
| recurrent | inferred-fallback | 61.75 | 95.40 | 75.94 | 43.86 | 12562.0 | 1464.1 |
| delayed | recent | 44.11 | 90.19 | n/a | 39.49 | 15697.6 | 0.0 |
| delayed | oracle | 49.99 | 79.31 | 100.00 | 43.30 | 4119.9 | 0.0 |
| delayed | noisy | 42.36 | 83.83 | 79.63 | 40.34 | 6526.1 | 0.0 |
| delayed | delayed-tag | 45.00 | 87.08 | 57.14 | 32.85 | 8844.8 | 0.0 |
| delayed | inferred | 40.86 | 80.11 | 60.85 | 28.23 | 7396.0 | 1308.1 |
| delayed | inferred-fallback | 45.06 | 90.19 | 60.85 | 33.76 | 8984.7 | 1308.1 |
| contradictory | recent | 50.22 | 95.57 | n/a | 38.96 | 17554.1 | 0.0 |
| contradictory | oracle | 49.33 | 81.68 | 100.00 | 31.05 | 8015.7 | 0.0 |
| contradictory | noisy | 45.59 | 88.29 | 79.63 | 36.11 | 8476.4 | 0.0 |
| contradictory | delayed-tag | 46.39 | 87.50 | 57.14 | 33.94 | 13974.8 | 0.0 |
| contradictory | inferred | 50.26 | 89.43 | 77.56 | 36.39 | 11085.9 | 1462.8 |
| contradictory | inferred-fallback | 52.92 | 95.57 | 77.56 | 41.03 | 12103.6 | 1462.8 |

Reproduce: node experiments/phi042-context-crucible.mjs test; node experiments/phi042-context-crucible.mjs. Prior experiments unchanged. No claim of full Φ042 completion or independent evaluation.
