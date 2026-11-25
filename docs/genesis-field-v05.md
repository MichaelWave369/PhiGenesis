# Genesis Field v0.5 — Adaptive continuity

Online batch-level strategy selection using the actual v0.3 finite learners and verified exchange. No LLM, network, arbitrary code execution or external packages. The learner receives only the outcome of its selected strategy before updating. Separate evaluator-only counterfactual runs are charged separately from deployment costs and never passed to the selector.

## Protocol

Each trial has 180 batches, each with four distinct quadratic target supports. Each batch starts with empty recipient memory and fixed generated coordinate permutations; memory accumulates within a batch only. Three strategies: cold per-target discovery, cumulative memory within the batch, verified peer exchange with local fallback. All use v0.3 mathematical rules, fixed audit and separate arithmetic oracle. Peer acquisition is treated as sunk (existing knowledge); historical source learning is recorded separately. Recipient calibration (10 endpoint observations per peer batch), audits, fallback and all exploration decisions are included in recipient observation costs.

The selector uses a sliding window of the last 12 observed costs per strategy, empirical means and standard-error diagnostics, forced initial exploration of all three strategies, then 12% epsilon-greedy exploration. The diagnostics do not control selection and are not calibrated confidence intervals. No phase labels, corruption probability or future outcomes are given to the policy. There is no explicit drift detector. The window counts selected-arm samples, not elapsed time; rarely selected arms may retain stale costs.

Eighteen deterministic seed-indexed trials for each of two streams: stationary clean and three-phase drift. Drift comprises 60 clean batches, 60 batches with approximately 90% bias-flipped messages, then 60 with approximately 10% bias-flipped messages. The stationary control uses the same target seed schedule but all messages are clean. The frozen v0.4 clean/existing four-target policy corresponds to always peer, while always cold and always cumulative memory are additional fixed comparators. A per-batch hindsight minimum is an unattainable lower bound. The selector learns from scratch, not from v0.4 calibration.

## Executed results

Each condition: 3,240 batches, 12,960 target rules, 38,880 held-out predictions. Every strategy recovered all target rules and held-out predictions exactly. Nine checks passed in the JS execution environment. All 36 trials replayed a pending mid-run decision and matched the final canonical event history.

| Method | Drifting stream | Stationary stream |
|---|---:|---:|
| Cold | 284585 | 284585 |
| Memory | 313460 | 313460 |
| Peer (frozen clean v0.4 choice) | 253521 | 200880 |
| Online adaptive | 262869 | 209638 |
| Hindsight | 233792 | 200880 |

The online selector costs 3.69% more than the best fixed strategy on the drift stream and 4.36% more than peer on stationary. It adapts away from the unreliable peer in phase two (173 peer choices in 1080 batches, versus 963 in phase one), but fails to rediscover improved reliability in phase three (59 peer choices). In phase two the adaptive policy costs 98443 versus always-peer 114233; phase three costs 93854 versus always-peer 72328. This is a negative result for the tested online selector, not evidence of universal adaptation. No hyperparameter retuning on this reported stream.

Historical sender cost for selected peer batches is 115754 in drift and 285410 in stationary, which would raise fully charged adaptive totals to 378623 and 495048. No total-lifetime efficiency or compute-performance claim.

## Persistence

Schema-5 canonical checkpoint stores seed, selected outcomes and pending flag; restore reconstructs decisions and checks canonical equality. Replay validates deterministic consistency, not cryptographic authenticity. A different valid outcome history can be forged. No concurrent writer protocol or power-loss guarantee. CLI uses exclusive temporary file followed by rename on step. Bounded to 360 rounds; per-batch mathematical learner has its existing fixed observation limits. Independent multi-process peers and durable per-peer relational memory are not implemented here.

## Run

    node runtime/cli-v05.mjs test
    node runtime/cli-v05.mjs summary
    node runtime/cli-v05.mjs init v05-checkpoint.json 12345
    node runtime/cli-v05.mjs step v05-checkpoint.json
    node runtime/cli-v05.mjs inspect v05-checkpoint.json

Node 22. Full benchmark aggregate and per-trial phase records in results/genesis_field_v05.json. The report deliberately omits individual batch records from the summary file; trial() returns these for reproduction. CI checks benchmark equality and actual cross-process checkpoint use.

## Next

Predeclare independent seed schedules and alternative drift regimes; compare time-decayed estimates, periodic probe budgets and change-detection methods without selecting winners on the same evaluation stream. Measure exploration cost, reacquisition delay and cumulative regret, not just prediction accuracy. This is an externally designed bandit-like policy in a finite simulated environment, not general metacognition or independently invented objectives.
