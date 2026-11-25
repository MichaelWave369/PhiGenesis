# Absent Architect E2 — Adaptive discovery and scoped Keyholes

Synthetic finite successor fixture, not physical cosmology, actual holographic hardware, consciousness, or operational security. E0 and E1 unchanged. Inspired by PhiGenesis Φ010 and NBGPocketMesh E0, no external repo imported.

## Frozen protocol

90 paired seeds (1–90), nine roots, each with a private hidden rule selected from the supplied 36 rotation/translation family on a modular 3×3 grid. Learners receive only one-bit marker observations for training cues 0,1,3. Six held-out cues are scored once each. No labels from evaluation enter learning. Clean regime is noiseless; noisy flips training observations with 0.1 probability (known to learner); scrambled keeps structured training but replaces held-out targets with independently generated uniform pseudorandom targets. Scrambled is a distribution-shift control, not a stationary alternate rule. Common step-indexed noise is paired across policies, not per-query noise. Deterministic seeded pseudorandom fixtures; not independent real populations.

Uniform prior over 36 supplied hypotheses; update by binary likelihood and normalize. Adaptive chooses the unused query with largest min(p,1-p), deterministic first tie; fixed scans the first budget entries in lexicographic cue/child order (intentionally simple and potentially weak baseline); blind draws paired uniform predictions with no reads. Adaptive and fixed both spend exactly 3,6,9 or 18 reads; no early stopping, no learning the hypothesis family or noise law. Predict maximal marginal probability (first tie). Blind prediction is uniform random; its reported probabilities are the uniform prior. Brier score is sum of squared nine-class errors (range 0–2); lower is better. Unique-correct measures whether a unique MAP hypothesis equals the evaluator's true training rule, not whether it remains valid under shift. Each correct prediction earns 3 tokens; each read spends 1 token, within a separately allocated read budget. Net score may be negative; not a resource conservation or actual economic model.

## Keyhole contract

Simulator binds actor to a root; request accepts only op,root,c,child and integer addresses. Reject foreign roots, unsupported operations, malformed fields, held-out cues and exhausted read budgets without spending or revealing a bit. Accepted observations debit one read and produce a deterministic decision record (actor, decision, cue, child, bit, remaining); refusals record reason and remaining. Records are replayable in-process by repeating the fixture and policy, not signed receipts or tamper-proof storage. Caller identity is a simulator convention, not authentication; entire world shares JS memory. No actual process isolation, network access, arbitrary execution or rule mutation. No real-world manipulation methods.

## Run

    node experiments/absent-architect-e2.mjs test
    node experiments/absent-architect-e2.mjs report 90

486 assertions passed in authoring JS runtime. Mean metrics across seeds and residents:

| Regime | Budget | Policy | Accuracy | Net tokens | Brier | Unique correct |
|---|---:|---|---:|---:|---:|---:|
| clean | 3 | adaptive | 27.98% | 2.037 | 0.7559 | 6.54% |
| clean | 3 | fixed | 20.47% | 0.685 | 0.8370 | 0.00% |
| clean | 3 | blind | 10.82% | 1.948 | 0.8889 | 0.00% |
| clean | 6 | adaptive | 55.66% | 4.019 | 0.4597 | 39.63% |
| clean | 6 | fixed | 23.85% | -1.707 | 0.7798 | 0.00% |
| clean | 6 | blind | 10.82% | 1.948 | 0.8889 | 0.00% |
| clean | 9 | adaptive | 85.37% | 6.367 | 0.1391 | 77.90% |
| clean | 9 | fixed | 26.15% | -4.293 | 0.7500 | 0.00% |
| clean | 9 | blind | 10.82% | 1.948 | 0.8889 | 0.00% |
| clean | 18 | adaptive | 100.00% | 0.000 | 0.0000 | 100.00% |
| clean | 18 | fixed | 100.00% | 0.000 | 0.0000 | 100.00% |
| clean | 18 | blind | 10.82% | 1.948 | 0.8889 | 0.00% |
| noisy | 3 | adaptive | 21.19% | 0.815 | 0.8383 | 5.06% |
| noisy | 3 | fixed | 17.88% | 0.219 | 0.8676 | 0.00% |
| noisy | 3 | blind | 10.82% | 1.948 | 0.8889 | 0.00% |
| noisy | 6 | adaptive | 36.09% | 0.496 | 0.7152 | 21.73% |
| noisy | 6 | fixed | 19.98% | -2.404 | 0.8415 | 0.00% |
| noisy | 6 | blind | 10.82% | 1.948 | 0.8889 | 0.00% |
| noisy | 9 | adaptive | 54.96% | 0.893 | 0.5346 | 42.84% |
| noisy | 9 | fixed | 24.32% | -4.622 | 0.8193 | 0.00% |
| noisy | 9 | blind | 10.82% | 1.948 | 0.8889 | 0.00% |
| noisy | 18 | adaptive | 80.02% | -3.596 | 0.2406 | 69.63% |
| noisy | 18 | fixed | 58.66% | -7.441 | 0.4768 | 34.81% |
| noisy | 18 | blind | 10.82% | 1.948 | 0.8889 | 0.00% |
| scrambled | 3 | adaptive | 11.28% | -0.970 | 1.0232 | 6.54% |
| scrambled | 3 | fixed | 11.28% | -0.970 | 0.9410 | 0.00% |
| scrambled | 3 | blind | 10.99% | 1.978 | 0.8889 | 0.00% |
| scrambled | 6 | adaptive | 10.56% | -4.100 | 1.3248 | 39.63% |
| scrambled | 6 | fixed | 11.05% | -4.011 | 0.9950 | 0.00% |
| scrambled | 6 | blind | 10.99% | 1.978 | 0.8889 | 0.00% |
| scrambled | 9 | adaptive | 10.14% | -7.174 | 1.6549 | 77.90% |
| scrambled | 9 | fixed | 10.86% | -7.044 | 1.0265 | 0.00% |
| scrambled | 9 | blind | 10.99% | 1.978 | 0.8889 | 0.00% |
| scrambled | 18 | adaptive | 10.25% | -16.156 | 1.7951 | 100.00% |
| scrambled | 18 | fixed | 10.25% | -16.156 | 1.7951 | 100.00% |
| scrambled | 18 | blind | 10.99% | 1.978 | 0.8889 | 0.00% |

The policy operates within a supplied finite grammar, fixed training scope, known noise model and simplified ledger. No adaptive stopping, cross-root collaboration or actual shared-resource institutions. Authorization refusal is an invariant by construction. Next: stronger randomized/balanced fixed-query baselines, calibrated abstention and early stopping under uncertain observation quality, before introducing consensual exchanges. No significance claim.
