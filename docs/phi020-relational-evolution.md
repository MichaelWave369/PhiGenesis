# Φ020 — Relational Evolution

Standalone successor to Φ019. Finite three-pocket weighted nearest-neighbor configuration; no executable self-modification, network, LLM, real Altermath integration or live promotion. Tests a recombination heuristic, not biological evolution or consciousness.

## Protocol

90 paired seeds. Shared calibration on two synthetic worlds A/B with complementary relevant feature axes. Each world exhaustively evaluates 27 configurations on probes and validates its best against fixed [4,4,4] on separate confirmation. Accepted distinct configurations plus baseline form a maximum-three-node archive. Archive is frozen for each target trial; no target history leakage. Calibration cost charged in full to all policies, even recall. Target regimes: familiar axes; mosaic of A/B axes; novel mixture of single-axis and diagonal labels; coupled mosaic with a fourth shared task whose routing weight depends on parity of the number of 8-weight pockets (even -> x, odd -> y), while shared task labels depend on y. This explicit artificial coupling creates a conflict with locally optimal mosaic. All worlds use fresh labeled memory, 24 rows per context, 12 probes, 12 confirmation and 18 held-out queries per context. Distinct deterministic streams, finite tuples may overlap. Distance is weighted Manhattan with stable first-match ties. No target axis or correct configuration is supplied to selectors.

Every policy evaluates the same archive on target probes; selects by total probe score with stable first-max ties. Recall adds no candidates. Compose picks best ancestor per local context from observed probe scores, ignoring the coupled fourth task during donor selection; tries full composition then fixed mask order, up to three distinct new configurations. Mutation tries one pocket at a time from the best whole ancestor toward locally best donor; random uses seeded random ordering. Compose and mutation fill unused slots from the same random ordering, so all three compare exactly three extra distinct configurations. Exhaustive probes all 27 as a higher-compute reference. Interpreter permits exactly three INHERIT records with unique destination pockets, same-index source, known ancestor ID and allowed value. No other instruction accepted. Fresh confirmation requires >=2 correct improvement and no per-context regression against fixed; if refused, shadow uses fixed. This does not require superiority to the best archived alternative on confirmation. Held-out scores are evaluation only. A novel accepted configuration records parent and donor IDs for composed winners. Active remains fixed and authority NONE. Candidate generation/evaluation, not physical nesting or arbitrary graph rewriting.

## Reproduce

    node experiments/phi020-relational-evolution.mjs test
    node experiments/phi020-relational-evolution.mjs report 90

Authoring JS runtime: 1050 assertions passed. Below fixed is count of trials, not percentage. Novel accepted means absent from archive; composed accepted is subset with actual inheritance operations, not random-fill. Mean comparisons include calibration, target probe/confirmation and two held-out scores; not wall time, observation acquisition or storage costs. No significance estimates.

| Regime | Policy | Accuracy | Fixed | Target comparisons | Total comparisons | Novel accepted | Composed accepted | Below fixed |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| familiar | recall | 92.72% | 86.98% | 6662 | 56774 | 0 | 0 | 0 |
| familiar | compose | 94.18% | 86.98% | 9254 | 59366 | 20 | 5 | 0 |
| familiar | mutation | 94.22% | 86.98% | 9254 | 59366 | 20 | 0 | 0 |
| familiar | random | 94.16% | 86.98% | 9254 | 59366 | 17 | 0 | 0 |
| familiar | exhaustive | 95.84% | 86.98% | 27648 | 77760 | 39 | 0 | 0 |
| mosaic | recall | 86.93% | 86.81% | 6662 | 56774 | 0 | 0 | 0 |
| mosaic | compose | 92.28% | 86.81% | 9254 | 59366 | 51 | 42 | 0 |
| mosaic | mutation | 90.10% | 86.81% | 9254 | 59366 | 40 | 0 | 0 |
| mosaic | random | 90.76% | 86.81% | 9254 | 59366 | 38 | 0 | 0 |
| mosaic | exhaustive | 95.21% | 86.81% | 27648 | 77760 | 66 | 0 | 0 |
| novel | recall | 86.69% | 86.69% | 6662 | 56774 | 0 | 0 | 0 |
| novel | compose | 88.13% | 86.69% | 9254 | 59366 | 23 | 23 | 0 |
| novel | mutation | 88.13% | 86.69% | 9254 | 59366 | 23 | 0 | 0 |
| novel | random | 86.79% | 86.69% | 9254 | 59366 | 2 | 0 | 0 |
| novel | exhaustive | 88.77% | 86.69% | 27648 | 77760 | 37 | 0 | 0 |
| coupled | recall | 74.32% | 74.12% | 8883 | 58995 | 0 | 0 | 0 |
| coupled | compose | 89.32% | 74.12% | 12339 | 62451 | 68 | 53 | 0 |
| coupled | mutation | 88.43% | 74.12% | 12339 | 62451 | 68 | 0 | 0 |
| coupled | random | 82.75% | 74.12% | 12339 | 62451 | 40 | 0 | 0 |
| coupled | exhaustive | 95.69% | 74.12% | 36864 | 86976 | 87 | 0 | 0 |

Replay recomputes entire finite trace, not authentication or durable storage. Thresholds, axes, coupling and archive are designed fixtures; local independent scoring favors recombination on mosaic while coupling can penalize it. Random filling means compare composite strategies, not pure operators. No claims of general performance, real security boundaries or readiness. Next: interaction-aware recombination, stronger coordinate baselines, independently enforced evaluator and persistent lineage; only then cross-repo adapters.
