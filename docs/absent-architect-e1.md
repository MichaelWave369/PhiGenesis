# Absent Architect E1 — Discoverable Substrate

Finite synthetic rule-discovery fixture; not evidence of holographic hardware, real-world cosmology, consciousness, or historical claims. E0 remains unchanged. Each of nine residents occupies one root with nine child addresses. The architect selects one of 36 hidden transformations per root: four quarter-turns and nine translations on a 3×3 modular grid. The evaluator uses explicit rotation matrices; the learner uses iterative rotation. No runtime intervention, external access, or rule changes.

## Protocol

90 paired seeds, nine independent local learners per seed. The family of 36 rules is supplied, not invented. A permitted resident scans all nine children for each of three training cues (0, 1, 3), receiving a one-hot marker. Exhaustive hypothesis elimination selects a rule only when unique. Contradictions or ambiguity abstain. No labels from six held-out cues enter training. Evaluation repeats each held-out cue six times (36 predictions per resident), one choice per prediction, three tokens per correct choice. The structured regime preserves the hidden rule; the scrambled control draws a separate uniform pseudorandom target per evaluation event independently of the supplied training rule. No shared learning, depletion, market, actual authorization boundary or communication. The entire fixture resides in one JS process; the learner receives sample pairs by convention. Blind predictions are matched across policies. Oracle sees evaluation targets and is a nondeployable ceiling, not a fair cost comparator.

Sealed: no training scans, blind prediction. Equal: all nine scan and learn. Unequal: three seeded residents scan and learn, remaining six predict blind. Matched blind: all pay scan cost but use the same blind predictions as sealed. Scan costs are charged post hoc at 0, 0.25, 1 and 2 tokens/read; no adaptive budget or training opportunity cost. Net tokens can be negative. No resources are earned during training. Cohort gap is gross tokens/resident in designated three minus other six. All policies have identical evaluation counts and paired fixtures. Accuracy is over repeated cues, not independent samples; pseudorandom seeds are deterministic. This is a separate successor fixture, not a numerical comparison to E0 harvest totals.

## Reproduce
Node 20+, no dependencies.

    node experiments/absent-architect-e1.mjs test
    node experiments/absent-architect-e1.mjs report 90

453 assertions passed in authoring JS runtime. Reported values are means across seeds and residents, except cohort gap (paired cohort means).

| Regime | Policy | Accuracy | Gross | Reads | Net at 1/read | Cohort gap |
|---|---|---:|---:|---:|---:|---:|
| structured | sealed | 11.18% | 12.070 | 0.0 | 12.070 | -0.156 |
| structured | equal | 100.00% | 108.000 | 27.0 | 81.000 | 0.000 |
| structured | unequal | 40.82% | 44.081 | 9.0 | 35.081 | 95.878 |
| structured | matched_blind | 11.18% | 12.070 | 27.0 | -14.930 | -0.156 |
| structured | oracle | 100.00% | 108.000 | 0.0 | 108.000 | 0.000 |
| scrambled | sealed | 11.19% | 12.085 | 0.0 | 12.085 | 1.156 |
| scrambled | equal | 11.33% | 12.237 | 27.0 | -14.763 | -0.256 |
| scrambled | unequal | 10.95% | 11.822 | 9.0 | 2.822 | 0.367 |
| scrambled | matched_blind | 11.19% | 12.085 | 27.0 | -14.915 | 1.156 |
| scrambled | oracle | 100.00% | 108.000 | 0.0 | 108.000 | 0.000 |

The structured family is intentionally simple and identifiable from anchors. Perfect generalization here establishes only recovery within that supplied family; no claim of spontaneous science or general intelligence. The scrambled control tests whether a rule remains useful when the environment has no stable corresponding relation. Cost sweeps are accounting scenarios, not real hardware expenses. Next: adaptive query selection under real simulated budgets, partially observable/noisy worlds, and bounded capability receipts before any city integration.
