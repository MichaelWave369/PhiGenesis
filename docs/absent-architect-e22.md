# Absent Architect E2.2 — bounded belief revision

Finite synthetic successor to E2.1. No evidence about real cosmology, consciousness, physical holographic hardware, social control, or deployed security. Earlier experiments unchanged.

## Protocol

90 paired integer seeds, nine independent roots, 36 supplied modular 3×3 rotation/translation rules. Old phase: six categorical target observations on cues 0,1,3 (two repetitions). Recovery: three or six fresh observations on the same cues, after a known phase boundary. Audit: four observations alternating distinct cues 2,4, only if model posterior maximum >=0.85. Final evaluation uses four different cues 5–8 and clean evaluator targets. No evaluation labels enter training or audit. Audit does not update the model; accept if at least three of four observed targets match its predictions, otherwise abstain on all four final cues. A repeated audit cue is not an independent structural test.

Clean stable, noisy stable, related shift (one parameter changes), unrelated shift (both parameters change), and scrambled (a fixed independent random target per cue in the new phase, potentially coincidentally in-family). Shift takes place before fresh observations; audit and scoring see that same new environment. In all regimes other than clean, generated categorical observation errors occur with probability .1; wrong targets are uniform over the other eight. Learner assumes .9/.0125 likelihood in every regime. Categorical observations reveal more than E2.1 binary probes, so neither cost nor raw performance is directly comparable across experiments. All randomness is deterministic seeded fixtures, not real independent populations.

## Policies

All learning policies receive identical six old observations. Frozen keeps old posterior and purchases no new training observations; retain uses old posterior unchanged as prior for new evidence; reset starts new phase with uniform prior; mixture assigns half the prior to old posterior, one quarter to a uniform transition to the 11 hypotheses sharing exactly one parameter with each old hypothesis, and one quarter to the uniform family. Retain, reset and mixture receive identical new observations for each budget. The mixture is a designed transition prior, not a learned change detector, not independent inference of a change point. Always abstain buys no observations and receives zero utility. All non-abstain policies use the same confidence and audit gate. Audit cost is conditional on eligibility and therefore may differ. Scope is a fixture convention, not process isolation or cross-repository authorization.

Utility: +3 per correct final prediction, -2 per wrong, 0 per abstention, -.25 per categorical observation. Full utility charges old, new and audit observations; incremental utility treats old observations as sunk. Reset still pays for the matched old acquisition in full accounting. Always abstain has zero cost in either accounting. No resource exchange or actual economy. No threshold tuning on held-out labels. Confidence thresholds, transition weights and costs are design choices, not calibrated probabilities or established optimal values.

## Reproduce

Node 20+, no dependencies.

    node experiments/absent-architect-e22.mjs test
    node experiments/absent-architect-e22.mjs report 90

3394 assertions passed in the authoring JS runtime. Coverage and wrong/all use all final opportunities; conditional accuracy uses admitted predictions only; ungated accuracy is the MAP prediction score before gating (for abstain it is only a uniform-prior tie-break diagnostic, not an action). Reads and utility are per resident.

| Regime | Fresh budget | Policy | Coverage | Conditional accuracy | Wrong/all | Ungated accuracy | Reads | Full utility | Incremental utility |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| clean | 3 | frozen | 100.00% | 100.00% | 0.00% | 100.00% | 10.000 | 9.500 | 11.000 |
| clean | 3 | retain | 100.00% | 100.00% | 0.00% | 100.00% | 13.000 | 8.750 | 10.250 |
| clean | 3 | reset | 100.00% | 100.00% | 0.00% | 100.00% | 13.000 | 8.750 | 10.250 |
| clean | 3 | mixture | 100.00% | 100.00% | 0.00% | 100.00% | 13.000 | 8.750 | 10.250 |
| clean | 3 | abstain | 0.00% | n/a | 0.00% | 9.01% | 0.000 | 0.000 | 0.000 |
| clean | 6 | frozen | 100.00% | 100.00% | 0.00% | 100.00% | 10.000 | 9.500 | 11.000 |
| clean | 6 | retain | 100.00% | 100.00% | 0.00% | 100.00% | 16.000 | 8.000 | 9.500 |
| clean | 6 | reset | 100.00% | 100.00% | 0.00% | 100.00% | 16.000 | 8.000 | 9.500 |
| clean | 6 | mixture | 100.00% | 100.00% | 0.00% | 100.00% | 16.000 | 8.000 | 9.500 |
| clean | 6 | abstain | 0.00% | n/a | 0.00% | 9.01% | 0.000 | 0.000 | 0.000 |
| stable-noisy | 3 | frozen | 93.21% | 100.00% | 0.00% | 99.04% | 9.941 | 8.700 | 10.200 |
| stable-noisy | 3 | retain | 94.57% | 100.00% | 0.00% | 100.00% | 13.000 | 8.098 | 9.598 |
| stable-noisy | 3 | reset | 80.00% | 100.00% | 0.00% | 91.94% | 12.442 | 6.490 | 7.990 |
| stable-noisy | 3 | mixture | 91.98% | 100.00% | 0.00% | 98.77% | 12.896 | 7.813 | 9.313 |
| stable-noisy | 3 | abstain | 0.00% | n/a | 0.00% | 9.01% | 0.000 | 0.000 | 0.000 |
| stable-noisy | 6 | frozen | 93.21% | 100.00% | 0.00% | 99.04% | 9.941 | 8.700 | 10.200 |
| stable-noisy | 6 | retain | 94.57% | 100.00% | 0.00% | 100.00% | 16.000 | 7.348 | 8.848 |
| stable-noisy | 6 | reset | 93.70% | 100.00% | 0.00% | 99.51% | 15.970 | 7.252 | 8.752 |
| stable-noisy | 6 | mixture | 94.32% | 100.00% | 0.00% | 99.75% | 15.990 | 7.321 | 8.821 |
| stable-noisy | 6 | abstain | 0.00% | n/a | 0.00% | 9.01% | 0.000 | 0.000 | 0.000 |
| related-shift | 3 | frozen | 0.00% | n/a | 0.00% | 0.12% | 9.941 | -2.485 | -0.985 |
| related-shift | 3 | retain | 0.74% | 100.00% | 0.00% | 2.87% | 12.832 | -3.119 | -1.619 |
| related-shift | 3 | reset | 77.53% | 100.00% | 0.00% | 90.09% | 12.328 | 6.222 | 7.722 |
| related-shift | 3 | mixture | 76.05% | 100.00% | 0.00% | 95.22% | 12.259 | 6.061 | 7.561 |
| related-shift | 3 | abstain | 0.00% | n/a | 0.00% | 10.59% | 0.000 | 0.000 | 0.000 |
| related-shift | 6 | frozen | 0.00% | n/a | 0.00% | 0.12% | 9.941 | -2.485 | -0.985 |
| related-shift | 6 | retain | 25.56% | 100.00% | 0.00% | 46.67% | 14.212 | -0.486 | 1.014 |
| related-shift | 6 | reset | 93.46% | 100.00% | 0.00% | 99.38% | 15.965 | 7.223 | 8.723 |
| related-shift | 6 | mixture | 93.46% | 100.00% | 0.00% | 99.75% | 15.960 | 7.225 | 8.725 |
| related-shift | 6 | abstain | 0.00% | n/a | 0.00% | 10.59% | 0.000 | 0.000 | 0.000 |
| unrelated-shift | 3 | frozen | 0.37% | 0.00% | 0.37% | 12.62% | 9.941 | -2.515 | -1.015 |
| unrelated-shift | 3 | retain | 0.86% | 57.14% | 0.37% | 14.29% | 12.822 | -3.176 | -1.676 |
| unrelated-shift | 3 | reset | 77.53% | 100.00% | 0.00% | 89.94% | 12.333 | 6.220 | 7.720 |
| unrelated-shift | 3 | mixture | 70.12% | 100.00% | 0.00% | 84.01% | 12.007 | 5.413 | 6.913 |
| unrelated-shift | 3 | abstain | 0.00% | n/a | 0.00% | 10.06% | 0.000 | 0.000 | 0.000 |
| unrelated-shift | 6 | frozen | 0.37% | 0.00% | 0.37% | 12.62% | 9.941 | -2.515 | -1.015 |
| unrelated-shift | 6 | retain | 25.06% | 99.51% | 0.12% | 50.34% | 14.212 | -0.570 | 0.930 |
| unrelated-shift | 6 | reset | 93.95% | 100.00% | 0.00% | 99.51% | 15.975 | 7.280 | 8.780 |
| unrelated-shift | 6 | mixture | 93.70% | 100.00% | 0.00% | 99.01% | 15.965 | 7.253 | 8.753 |
| unrelated-shift | 6 | abstain | 0.00% | n/a | 0.00% | 10.06% | 0.000 | 0.000 | 0.000 |
| scrambled | 3 | frozen | 2.47% | 10.00% | 2.22% | 11.27% | 9.941 | -2.633 | -1.133 |
| scrambled | 3 | retain | 2.35% | 9.21% | 2.13% | 11.27% | 12.877 | -3.364 | -1.864 |
| scrambled | 3 | reset | 0.49% | 0.00% | 0.49% | 11.23% | 11.030 | -2.797 | -1.297 |
| scrambled | 3 | mixture | 0.00% | n/a | 0.00% | 11.33% | 9.726 | -2.431 | -0.931 |
| scrambled | 3 | abstain | 0.00% | n/a | 0.00% | 11.14% | 0.000 | 0.000 | 0.000 |
| scrambled | 6 | frozen | 2.47% | 10.00% | 2.22% | 11.27% | 9.941 | -2.633 | -1.133 |
| scrambled | 6 | retain | 1.85% | 6.67% | 1.73% | 11.17% | 15.383 | -3.969 | -2.469 |
| scrambled | 6 | reset | 0.74% | 4.17% | 0.71% | 11.54% | 14.114 | -3.581 | -2.081 |
| scrambled | 6 | mixture | 0.62% | 5.00% | 0.59% | 11.23% | 13.941 | -3.528 | -2.028 |
| scrambled | 6 | abstain | 0.00% | n/a | 0.00% | 11.14% | 0.000 | 0.000 | 0.000 |

## Limits

Known phase boundary; supplied grammar and error likelihood; intentionally strong categorical observation interface; fixed priors and audit thresholds; no continual change detection or calibrated uncertainty. The mixture's structural assumptions can be wrong. Audit may fail to distinguish models that agree on the two audit cues. No actual security boundary or independent agents/processes. No significance claim. Next gate: unannounced change points, false alarms, cost-aware recovery, and validation of thresholds on separate seed blocks. Voluntary exchange should retain explicit consent and accounting independent of learned belief.
