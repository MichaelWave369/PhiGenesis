# Genesis Field v0.7 — Bounded computational curiosity

Compare a heuristic value-of-information policy with greedy, random, periodic and actual v0.6 combined policies using the actual finite learners and verified peer exchange from v0.3/v0.5. No LLM, external packages, networking or arbitrary code execution. This tests functional experiment selection, not subjective curiosity.

## Protocol

Four streams, nine deterministic seeds each, 144 batches per seed, four target rules per batch. Stable: 15% simulated packet bias flips. Abrupt: 8%, 92%, 8% with transitions at batches 36 and 84. Gradual: triangular ramp from 5% to 90% and back. Bursts: 90% in the middle 12 batches of each 36-batch period, 8% otherwise. New seed schedule and generator multiplier relative to v0.6. All strategies see only selected-arm outcomes; evaluator runs other arms separately. Outcomes are deterministic and shared among policies only for evaluation efficiency. All mathematical arms are verified on each batch. Relational memory resets per batch; strategy history persists.

New policies share elapsed-time weighting (12-batch half-life), weak prior (weight .5, mean 90), three forced initial selections. Greedy thereafter chooses the lowest estimated mean. Random and periodic policies use one non-greedy probe every six batches, random or most overdue respectively. Curiosity uses a two-point predictive proxy with symmetric cost spread (fixed 25 for peer, 12 otherwise, scaled by effective sample weight). Estimate expected improvement in the minimum predicted cost after one hypothetical observation, multiply by horizon 12, subtract immediate expected opportunity cost; choose positive highest-scoring alternative when a probe token is available. Clipping, prior and fixed spreads are heuristics, not calibrated predictive distributions or an exact Bayesian value-of-information calculation. Probe tokens accrue every six batches, maximum 24, only 23 available within a 144-batch run. Three forced initial selections are separate but fully charged. Curiosity may bank tokens; random and periodic use them on schedule. v0.6 has its original exploration schedule and is not subject to this matched cap.

## Results

5,184 batches per policy, 103,680 exact target recoveries and 311,040 correct held-out predictions across five adaptive policies. 144 new-policy mid-run replay checks; nine regression tests executed successfully in JavaScript. Static comparator outcomes also checked for correctness.

| Policy | Stable | Abrupt | Gradual | Bursts |
|---|---:|---:|---:|---:|
| Cold | 114012 | 114012 | 114012 | 114012 |
| Memory | 125690 | 125690 | 125690 | 125690 |
| Peer | 89803 | 103184 | 110566 | 102703 |
| Greedy | 90183 | 109678 | 110949 | 113332 |
| Random | 95133 | 102500 | 110457 | 107065 |
| Periodic | 95137 | 102832 | 110337 | 107350 |
| Curiosity | 90183 | 99514 | 107824 | 102526 |
| v06 | 96445 | 104459 | 110839 | 108928 |
| Hindsight | 89424 | 94676 | 102768 | 94672 |

Curiosity used 0, 137, 177 and 159 additional probes out of 207 available per regime. Random and periodic each used 207. No extra probes in stable does not mean no investigation; exploitation and initial trials still observe outcomes. Curiosity improves recipient observation costs over v06 in all four designed regimes. It beats always-peer in the three changing regimes, but not stable. Equal mixture: 400047 recipient observations versus 420671 for v06 (about 4.90% less).

## Full costs and limitations

Existing peer knowledge is treated as sunk for recipient comparisons, but actual historical source costs are recorded for all methods. Fully charged curiosity totals: 214227, 187589, 178372, 208276; cold costs 114012 each. Thus no end-to-end efficiency claim. No compute or bandwidth equivalence. Actual probes are full batches, not cheap diagnostic subqueries. The policy has fixed externally chosen parameters, no explicit change detector, no independent hyperparameter calibration or generalization beyond these designed streams. No claim of general intelligence or subjective experience. Checkpoints are canonical replay records, not authenticated. v0.7 tests in-memory replay; no new disk CLI persistence test. Earlier runtimes remain intact. Next: a shared bounded runtime interface, interoperable event schema and independent evaluation of integrated components rather than continued isolated policy variants.

## Reproduce

    node runtime/cli-v07.mjs test
    node runtime/cli-v07.mjs summary

Node 22, no packages. Full per-trial results in results/genesis_field_v07.json; CI compares them against reproduction.
