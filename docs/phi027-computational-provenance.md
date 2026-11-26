# Φ027 — Authenticated computational provenance (pilot)

Standalone adapter over unchanged Φ025 planner and Φ026 context-aware replay/evaluator. No production promotion, live cross-repo adapters or persistent journal migration.

## Chain of custody

A distinct planner role signs a domain-separated discovery envelope binding session, sequential discovery ID, hash of the exact preceding Φ026 event prefix, signed context hash, deterministic planner seed and policy, complete report hash, measured target/source comparison counts and exact proposed configuration (or null). Replay recomputes the actual Φ025 planner report from the authenticated context and lineage. It refuses a signed but false report, cost, history or candidate. The full report can be regenerated from the recorded inputs and fixed planner implementation; only its hash is stored. No claim of authentication of actual external observations or peer identities: peers remain simulated. Code version is implicitly fixed by this pilot module/import; explicit artifact digest binding remains future work.

A proposal-bearing discovery must be consumed by a domain-separated operator-signed submit envelope binding the discovery hash and exact Φ026 signed proposal, or explicitly discarded by a signed operator envelope. Direct proposal insertion is refused. No context change, receipt or decision while discovery is unresolved. The embedded proposal undergoes unchanged Φ026 replay, including context/ancestry checks and evaluation reservation. Receipt and decision hashes then attach to the provenance index and approved node ID. A no-candidate discovery is terminal and still counted. Maximum 18 discoveries, 18 Φ026 attempts, 108 wrapper events. Planner report comparison counts are separate from reserved evaluation comparisons. Replay itself incurs verification compute not included in those counters. A discovery is recorded after planning; attempted/interrupted work before recording is not accounted for. No automatic retry or authority escalation.

## Trust and limitations

Four Ed25519 roles in Node harness; same trusted host owns all keys. Adapter assumes trusted fixed env implementation and public keys. Signatures authenticate claims; deterministic recomputation checks synthetic report consistency but does not prove real observation truth or independent custody. Prior Φ026 signatures retained; new envelope signatures domain-separated. Discovery history hash covers legacy event prefix, not prior discarded/no-candidate discovery events; wrapper replay enforces sequential IDs but no independent append-only witness or protected latest-head pin. No durable storage, crash recovery, full accounting of attempts, or migration to Φ024 witness yet. This is not a general security boundary. Existing experiments remain untouched.

## Reproduce

    node experiments/phi027-provenance-test.mjs

Authoring runtime: 15 adapter checks passed using mock legacy replay, planner and noncryptographic verification. Node integration test uses actual Φ025 planner, Φ026 replay and evaluator subprocess, real Ed25519, two signed-context approvals, signed false-report/cost refusal, direct proposal and candidate substitution refusal, and no-candidate accounting. Remote CI must verify these separately. Selected demonstration fixtures, not a scientific benchmark.

Next: Φ028 pre-execution reservations, durable accounting for abandoned work, bind planner version and complete wrapper prefix, migrate to witnessed persistence with explicit schema version. No release readiness claim.
