# Absent Architect E2.1 — selective prediction and independent audit

Synthetic finite successor to E2; original experiments unchanged. No physical cosmology, real holographic hardware, consciousness, deployed security, or social manipulation claims.

## Frozen design

90 paired integer seeds, nine local roots, supplied 36 modular-grid rotation/translation rules. Disjoint cue sets: training 0,1,3; audit 2,4; final scoring 5,6,7,8. Clean: stable rule, no noise. Noisy: stable rule and 10% bit-flip probability on training/audit observations. Shifted: training rule changes to a different member of the family at audit/evaluation; scrambled: independently generated uniform pseudorandom targets fixed per cue at audit/evaluation. Both shift regimes have the same 10% observation-noise model as noisy. These are deterministic pseudorandom fixtures, not real independent populations. Audit and evaluation use the same post-training regime, not a later unseen change. Separate step-indexed noise sequences for training and audit are paired across policies. Repeated audit probes have independent generated flips but reuse the same underlying two cues, so are not six independent structural tests.

Bayesian learner assumes 10% noise in all regimes (including clean), uniform prior, supplied grammar. Adaptive chooses the unused binary marker query nearest posterior probability 1/2, fixed balanced interleaves three training cues with per-cue seeded random child permutations. Early stop at maximum posterior >=.95 or 12 reads. Fixed variants always use 12 reads. Admit model for potential evaluation only at posterior >=.9; verified variants additionally require at least five positive predictions of six binary probes (alternating two distinct audit cues); failed admission abstains on all four final cues. Audit does not update model; this is contradiction screening, NOT learned recalibration or model revision. Blind always predicts paired uniform random targets, zero reads. Adaptive verified and unverified share identical training and potential predictions. Audit is only purchased for eligible models. Hard cap 18 reads, 12 training, 6 audit. All evaluated outcomes are clean oracle targets, not noisy observations. Utility = +3 correct, -2 wrong, 0 abstained, -.25 per read. This is a designed accounting objective, not a realistic economy. No optimization or tuning on holdout; all thresholds and rewards are engineering choices, not validated calibration. Confidence is a model posterior, not empirically calibrated probability.

## Reproduce
Node 20+, no dependencies.

    node experiments/absent-architect-e21.mjs test
    node experiments/absent-architect-e21.mjs report 90

1531 assertions passed in authoring JS runtime. Coverage and wrong rate use all final cues; conditional accuracy uses only admitted predictions (n/a if none). Read and utility means are per resident. Report also includes ungated accuracy, confidence, eligibility, admission and audit refusal. 

| Regime | Policy | Coverage | Conditional accuracy | Wrong/all | Train reads | Audit reads | Utility |
|---|---|---:|---:|---:|---:|---:|---:|
| clean | adaptive-verify | 87.90% | 100.00% | 0.00% | 10.143 | 5.274 | 6.694 |
| clean | adaptive-unverified | 87.90% | 100.00% | 0.00% | 10.143 | 0.000 | 8.012 |
| clean | adaptive-fixed-verify | 87.90% | 100.00% | 0.00% | 12.000 | 5.274 | 6.230 |
| clean | balanced-fixed-verify | 8.64% | 100.00% | 0.00% | 12.000 | 0.519 | -2.093 |
| clean | blind | 100.00% | 11.57% | 88.43% | 0.000 | 0.000 | -5.685 |
| noisy | adaptive-verify | 46.17% | 100.00% | 0.00% | 11.230 | 3.259 | 1.919 |
| noisy | adaptive-unverified | 54.32% | 94.60% | 2.93% | 11.230 | 0.000 | 3.125 |
| noisy | adaptive-fixed-verify | 45.31% | 100.00% | 0.00% | 12.000 | 3.163 | 1.646 |
| noisy | balanced-fixed-verify | 3.46% | 100.00% | 0.00% | 12.000 | 0.259 | -2.650 |
| noisy | blind | 100.00% | 11.57% | 88.43% | 0.000 | 0.000 | -5.685 |
| shifted | adaptive-verify | 0.12% | 0.00% | 0.12% | 11.230 | 3.259 | -3.632 |
| shifted | adaptive-unverified | 54.32% | 8.75% | 49.57% | 11.230 | 0.000 | -6.202 |
| shifted | adaptive-fixed-verify | 0.12% | 0.00% | 0.12% | 12.000 | 3.163 | -3.801 |
| shifted | balanced-fixed-verify | 0.12% | 100.00% | 0.00% | 12.000 | 0.259 | -3.050 |
| shifted | blind | 100.00% | 11.51% | 88.49% | 0.000 | 0.000 | -5.698 |
| scrambled | adaptive-verify | 0.62% | 25.00% | 0.46% | 11.230 | 3.259 | -3.641 |
| scrambled | adaptive-unverified | 54.32% | 11.19% | 48.24% | 11.230 | 0.000 | -5.937 |
| scrambled | adaptive-fixed-verify | 0.62% | 25.00% | 0.46% | 12.000 | 3.163 | -3.809 |
| scrambled | balanced-fixed-verify | 0.00% | n/a | 0.00% | 12.000 | 0.259 | -3.065 |
| scrambled | blind | 100.00% | 10.49% | 89.51% | 0.000 | 0.000 | -5.901 |

## Limits and next gates

An audit can miss a change that agrees on its two cues; repeated probes do not eliminate this structural blind spot. Verified admission may reject correct models due to noise and may spend resources on evidence that doesn't pay off. Balanced fixed is stronger than a lexicographic scan but not an optimal fixed design. No explicit external Keyhole integration, process isolation, signatures or durable receipts. No confidence calibration fitted or measured across probability bins; selective accuracy/coverage are descriptive, not a guarantee. No claim of statistical significance. Next: assess alternative thresholds on a separate validation split, test correlated audit noise, implement fresh-query model revision, then introduce consensual resource exchange using independent authorization.
