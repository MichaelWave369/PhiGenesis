# Φ023 — Evolutionary Continuity (pilot)

Standalone successor to Φ022. Earlier experiments and RC2 untouched. Durable content-addressed snapshots, separately signed operator anchor, separate role-key CLI invocations, incumbent-relative admission, and explicit abandonment of unresolved reservations. No live promotion, network, arbitrary code execution, automatic re-evaluation or full earlier-algorithm integration.

## Trust and storage

The trusted configuration specifies session and distinct Ed25519 public keys. Fingerprints bind the journal to that configuration. Operator-key commands reserve a bounded proposal, record evaluator receipts and sign decisions; evaluator-key command reads a pending reservation and runs the fixed evaluator as a child process. Each invocation takes only its own private key path; the harness generates both and runs under one OS user, so this is role separation, not independently enforced key custody. Real operators must protect private keys, trusted config and the latest anchor outside candidate control.

Snapshot bytes are SHA-256 addressed, written through exclusive temporary files, fsync and hard-link publication; the signed anchor is updated only after snapshot durability. Anchor update uses atomic rename and directory fsync. Initialization uses exclusive publication. Unreferenced snapshots are ignored. One trusted writer only; pre-update head comparison is not a concurrent-writer lock. No power-loss qualification, disk exhaustion handling, garbage collection, crash injection or protection against replacement of the entire anchor with a previously valid signed anchor. The test explicitly demonstrates that rollback limit. A separately protected monotonic latest-head pin is required for rollback resistance. Both storage and role key paths are trusted. Linux Node 22 CI, no portability claim.

## Admission and recovery

Maximum 18 attempts, 54 events, 1458 reserved comparisons per proposal, one pending attempt at a time. Exact finite three-weight learn/recall/compose proposals bind session, parent and incumbent. Separate evaluator receipt binds proposal and per-context fixed, incumbent and candidate scores. Approval requires >=2 total improvement over incumbent, no per-context regression versus incumbent or fixed; signed decision binds receipt. Unresolved work can be explicitly abandoned, without running an evaluator; completed evidence can be rejected. Reservation is charged even if abandoned; this is a conservative reservation budget, not observed actual compute. Replaying signed events reconstructs lineage and rejected/abandoned history. No claim of exactly-once execution: a manually repeated evaluate before receipt recording can recompute; recovery never invokes it automatically. Production stays fixed [4,4,4]. The fixture is public and deliberately constructed (baseline [7,9,7], first [9,9,7], second [9,9,9]), not a sealed scientific benchmark.

## Reproduce

    node experiments/phi023-continuity-test.mjs

Authoring JS runtime: 17 protocol assertions passed with a signature test double. CI harness exercises real subprocess cold starts, actual Ed25519 role checks, persistence, two incremental approvals, wrong-key refusal, replay refusal, incumbent downgrade refusal, abandonment, snapshot alteration and signed-anchor rollback limitation. Node integration results must be verified separately. No claims of general intelligence, full PhiOS/Agentora integration or release readiness.

Next: external monotonic anchor service, separately controlled key custody, crash-injection tests at snapshot/anchor boundaries, evaluation suite isolation and typed adapters for Φ017–021. Review RC2 recovery protocol before integrating.
