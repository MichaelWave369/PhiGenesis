# Φ034 — Integrated field validation (research acceptance pilot)

Final milestone of Φ017–034. Reuses actual Φ030 memory, Φ031 Altermath interpreter bridge, Φ032 Agentora draft planning, Φ033 PhiOS Covenant review, Φ028 journal and Φ029 quorum adapter. No production promotion. This is a validation suite and explicit blocked release gate, not a new execution engine.

## Acceptance path
- Two identical Φ032 exports from pinned source, checked byte-for-byte.
- Actual Φ032 staging and Φ033 review for 12 packets using scratch SQLite; new database session verifies each report, cross-packet substitution and actual memory-permission drift refused, restored state rechecked.
- Canonical JSON SHA-256 batch binding; Node checks narrow batch shape and zero-authority semantics. Python host is trusted to run full review; Node does not reconstruct every Python contract or independently authenticate observations.
- Actual signed Φ028 journal with a context, unused reservation and explicit abandonment, three Φ029 witnesses and fresh challenge. Refuse unresolved work, stale quorum, insufficient witnesses and journal suffix rollback. An operator-signed association binds exact batch digest to exact current journal count/head and quorum identity, with no authority; changed batch or newer checkpoint invalidates old association.
- Witnesses authenticate the accounting checkpoint **only**, not review batch or association. Accounting journal is a separate synthetic reservation example; it does not account for actual memory, interpreter, Agentora or PhiOS work. Association is not a journal event or witnessed attestation of batch truth. No durable association storage. Gate takes a trusted freshly verified quorum result; raw caller-supplied certificate objects are not independently authenticated by gate.

## Status and release gate

Authoring: 16 pure gate assertions with hash/signature test doubles. Node/Python full integration and real cryptography configured in CI, not confirmed at authoring. The suite runs prior dedicated Φ028/029/033 test harnesses and new integrated path. A passing research validation always returns release BLOCKED. Open blockers: independent key custody, protected monotonic witness storage, full runtime/source attestation, cross-repo attempted-work accounting, live enforcement, independent evaluation. Coordinated rollback remains possible. No BFT, no autonomous execution, no self-modification, no consciousness or scientific performance claim. Scratch fixtures, all keys same OS account. CI pins source commits but transitive Python dependencies not locked. No actual PhiMemory9 or PocketMesh runtime integration. Existing RC2 release gate remains unchanged and blocked.

Sources: PhiGenesis 22114dc95ee56b49cd23a5eeff1b8a0a3d1d972e for Φ033 manifest and exporter; PR base 462384a1e732f4676f6079ecf8bbbef1661e19f6 for merged Φ033 and journal/witness implementation; Agentora 49166bb5365975d68df744678f91a837b0da48f2; Altermath 99a40f6f8e6f4ded656dd3655778dfffa72a3754; PhiOS da87f8fe7d26036a61a97aca6eebc2afc2a747c3.

Next: freeze experimental milestone series, resolve blockers individually before any live pilot; do not infer release readiness from CI.
