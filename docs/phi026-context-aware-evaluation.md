# Φ026 — Context-aware independent evaluation (pilot)

Standalone protocol successor to Φ025. Reuses its actual advisory planner in the Node integration test. Earlier Φ023/024 journal and witness formats remain unchanged; this new event schema is not yet durable or witnessed. No production promotion or external integration.

## Protocol

Three signing roles: context authority, operator, evaluator. A signed context establishes a monotonic epoch and a fixed evaluation suite before any proposal. Its commitment is SHA-256 over session, epoch, world, evaluator seed and salt. Operator signs a bounded proposal binding current incumbent, lineage and exact signed context. Context changes are refused during pending attempts. Evaluator process verifies signed context/proposal and commitment opening before scoring. Receipt binds session, proposal hash, context hash, commitment, comparison cost and metrics. Operator decision binds exact proposal and receipt; >=2 additional correct over incumbent and no per-context regression versus incumbent or fixed required. Rejection or unresolved abandonment allowed. Replay admits only shadow weights; production fixed. At most 18 attempts, 18 contexts, 90 events; 2592 comparisons reserved per proposal. No automatic decision. No signature can substitute for another role's expected key.

The evaluator uses a distinct fixture generator and seed from Φ025 planner, 24 memory rows and 12 queries per context, three configs scored. Different seeds do not guarantee disjoint feature tuples. In the demonstration the context authority knows scripted axes, evaluator seed is selected to exercise approval and is public in test source; random salts bind but do not provide independent benchmark secrecy in this harness. A real authority must establish context using independent evidence and evaluator must protect unseen datasets and keys. The replay verifies signed metrics, not correctness of the evaluator's claimed observations. The worker receives trust configuration and commitment opening from trusted host, not candidate. No OS security enforcement; one test harness controls all keys. The worker is separate process, not separately administered principal. No durable reservations for advisory planning, no protection against whole-history rollback, no automatic context inference, no real-world accuracy or general intelligence claim.

## Reproduce

    node experiments/phi026-context-test.mjs

Authoring runtime: 196 pure assertions passed with hash/signature test doubles and deterministic scoring. Positive control evaluation seeds 27186 and 27187, distinct from planner seed 1. Aligned baseline/incumbent 10/11/11, candidate 12/12/12; shifted baseline 12/12/9, incumbent 5/5/5, candidate 12/12/12. Designed fixture, not scientific benchmark. Node harness exercises actual Φ025 planning, real Ed25519, subprocess commitment checks, epoch refusal, signed receipt and explicit operator approval. Remote CI must verify integration separately.

Next: authenticate planner evidence and bind it to proposal, integrate durable journal/witness schema with migration strategy, record complete attempted planning costs and independent key custody. Earlier experiments preserved.
