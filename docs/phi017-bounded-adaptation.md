# Φ017 — Bounded Cognitive Adaptation

A standalone, language-free CPU experiment. Tests a tiny relational memory-routing hypothesis, not general intelligence, consciousness, neural self-rewriting, or live PhiOS integration.

## Protocol

90 paired seeds, three regimes: stationary (both contexts depend on x), specialized (context 0 depends on x, context 1 on y), shifted (specialized during training/validation, reversed on final test). Each split has 54 labeled memories and 36 labeled queries, equally divided across two contexts, generated from distinct deterministic PRNG initial states. Labels are floor(relevant feature / 3). Nearest neighbor uses weighted Manhattan distance within context, deterministic first-match tie-breaking. The evaluator sees labels; routing uses only feature values. This is synthetic and the context labels and candidate topology are supplied by the experimenter.

Fixed uses weights [4,4]. Flat searches nine global weights [w,w], w=0..8. Pocket searches nine context-specific pairs from {0,4,8} squared. Both adaptive conditions receive exactly nine training evaluations; fixed spends one, not nine. Different search spaces/inductive biases are intentional, not proof that nested structures outperform all conventional methods. Ties select the first candidate in fixed enumeration. Every candidate is expressed as two allowlisted SET_WEIGHT operations on distinct pocket IDs 0 and 1; range 0..8. No arbitrary code, privileges, external calls, evaluator edits, or automatic promotion.

Select on training alone. Separate validation requires at least two more correct queries (of 36), no per-context regression and no increase in query comparison count versus fixed. Otherwise fall back to baseline. Final test is never used for selection or admission. Report evaluates shadow configurations only; active state stays fixed and authority NONE. Full comparison accounting includes training, validation reference and candidate, and held-out reference and shadow. No wall-clock or memory measurement yet. Distinct seeded fixtures are not a guarantee that individual feature tuples never overlap in this finite domain.

## Reproduce

    node experiments/phi017-bounded-adaptation.mjs test
    node experiments/phi017-bounded-adaptation.mjs report 90

Authoring JavaScript runtime: 334 assertions passed. Results below are synthetic paired-seed averages, not significance tests.

| Regime | Policy | Test accuracy | Fixed reference | Eligible / 90 | Test regressions / 90 | Mean comparisons |
|---|---|---:|---:|---:|---:|---:|
| stationary | fixed | 87.75% | 87.75% | 0 | 0 | 4860 |
| stationary | flat | 95.83% | 87.75% | 75 | 0 | 12636 |
| stationary | pocket | 95.59% | 87.75% | 72 | 0 | 12636 |
| specialized | fixed | 88.40% | 88.40% | 0 | 0 | 4860 |
| specialized | flat | 88.40% | 88.40% | 2 | 1 | 12636 |
| specialized | pocket | 96.57% | 88.40% | 76 | 0 | 12636 |
| shifted | fixed | 88.49% | 88.49% | 0 | 0 | 4860 |
| shifted | flat | 88.55% | 88.49% | 2 | 1 | 12636 |
| shifted | pocket | 46.64% | 88.49% | 76 | 76 | 12636 |

Replay recomputes the complete trace from seed, regime and policy and rejects inconsistencies. It is deterministic verification, not cryptographic authentication, durable journaling, process isolation, or independent security enforcement. Validation is independent of selection data but uses the same trusted implementation; shift can defeat it. The experiment deliberately records regressions instead of claiming safe generalization. No external repo dependencies or LLM. Proposed next steps: independent evaluator process, authenticated receipts, fixed-model retrieval tasks, latency/memory budgets, stronger baselines and paired uncertainty estimates, then adapters to Agentora, Altermath, Pocket Mesh, PhiMemory9 and PhiOS only after interface audits.
