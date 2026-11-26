# Φ029 — Protected Witness Authority (quorum pilot)

Standalone adapter over unchanged Φ028 journal. Three distinct Ed25519 witness identities and four existing roles; key fingerprints and planner artifact bind the quorum session. Each witness starts at empty genesis and stores signed monotonic checkpoints. It checks the authenticated Φ028 journal and confirms that its previous checkpoint hash is still present at the same count. It may advance across multiple verified journal records. No replacement of a checkpoint slot; file fsync and directory fsync before acknowledgement. Orphan temp ignored. Cold read verifies signatures, sequence and preceding checkpoint hashes.

A reader generates a fresh random 256-bit challenge, obtains one signed attestation per available witness, and requires at least two distinct configured identities attesting the exact current journal count and head. Any supplied malformed, stale or dissenting attestation causes refusal; explicit null means unavailable. No automatic arbitration or synchronization, no candidate changes or production promotion. A lagging witness may explicitly catch up from verified history. A witness can refuse a journal behind its checkpoint, even if journal prefix signatures are valid. The read adapter returns the authoritative shadow state only under its quorum check; older APIs remain usable and do not enforce this policy.

## Trust model and limitations

This is not Byzantine consensus. Two-of-three matching attestations are a crash-fault-oriented read policy assuming honest, independently protected witness keys and storage, a trusted reader that does not suppress disagreement, fresh challenges and trusted runtime/config. With a malicious equivocating witness, conflicting two-of-three quorums can exist; no Byzantine-fault-tolerant claim. All keys/directories in test are under one OS user. No real independent key custody, remote service, secure hardware counter, durable external checkpoint, multi-writer protocol, or protection against coordinated rollback of journal and witness suffixes. Test explicitly demonstrates that limit. Fresh challenge prevents simple reuse of old attestations, not dishonest new attestations. Witness synchronization and reader checks do not prevent direct older CLI execution. Single trusted writer and protected filesystem assumed. Process SIGKILL tests do not establish physical power-loss durability. Verification overhead not included in Φ028 comparison accounting.

## Reproduce

    node experiments/phi029-quorum-test.mjs

Authoring runtime: 18 pure protocol assertions passed with noncryptographic test doubles. Node CI exercises actual Ed25519 and Φ028 storage, three separate witness process invocations, two SIGKILL boundaries, lagging/dissent refusal, two-witness availability, insufficient quorum, fresh challenge, operator journal suffix rollback, one-witness rollback and coordinated rollback limitation. Actual remote results await CI. No release readiness claim.

Next: delayed observation and persistent memory protocol, independently administered witness deployment and protected monotonic latest head before any live integration. Earlier milestones unchanged.
