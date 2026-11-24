# Genesis Field v0.1

First integrated runtime in standard JavaScript ES modules (Node 22 CLI, no packages). Combines finite numerical environments, executable affine parity rules, active inquiry, separate observation partitions, revisable memory and deterministic event replay. It is not an autonomous general intelligence or an integration of all nine experiments.

## Protocol

Five-bit input space, 64 affine parity hypotheses, 16 permitted discovery inputs, 8 audit inputs and 8 untouched test inputs. The caller supplies binary observations in response to pending queries. Greedy balanced partitioning chooses discovery queries; an audit checks the unique surviving candidate. A remembered candidate is audited before reuse; contradiction invalidates it and restarts discovery without using audit labels as training data. Failed audits, unresolved hypotheses and exhausted budgets cause abstention. Maximum 32 observations per episode and 4096 history events. Memory uses externally supplied world IDs. No network, arbitrary execution, deployment, LLM or mutation.

Checkpoints contain canonical versioned JSON event history; restoration replays the sequence. This is not cryptographic authentication. Single-writer CLI uses an exclusive temporary file and rename after each observation; no fsync, concurrency lock, power-loss guarantee or automatic stale-temp recovery. Use only trusted local checkpoints.

## Run

    node runtime/cli.mjs test
    node runtime/cli.mjs report
    node runtime/cli.mjs init genesis-checkpoint.json
    node runtime/cli.mjs step genesis-checkpoint.json
    node runtime/cli.mjs resume genesis-checkpoint.json

Resume after a completed episode starts a revisit. The CLI demo uses a fixed hidden rule; the report exercises drift and incompatible worlds. Use a fresh checkpoint path for a new demo.

## Measured results

90 deterministic seed-indexed trials, not independent draws (LCG low bits and finite rule space repeat). 720/720 untouched predictions on initial, revisited and changed affine conditions respectively; 90/90 prior invalidations, 90/90 nonlinear abstentions, 90/90 replay matches. Query means: cold and initial 14, revisit 8, drift 17.7222, nonlinear 15. Includes audit. Drift costs more than cold learning. Eight core regression checks pass, including all 64 affine rules and mid-episode replay. Full per-trial record in results/genesis_field_v01.json.

## Limits

Learner and simulator share parity evaluation; the partitions are separate but not independently implemented oracles. The audit spans the affine space and detects the tested quadratic perturbation by design; this is not general OOD detection. No stochastic robustness, adaptive symbol construction, communication or architecture invention yet. Stable world identity and clean stationary observations per episode are assumed. Disk-level restart CI remains to be verified. Next: higher-order construction, explicit model provenance, independently generated test environments.
