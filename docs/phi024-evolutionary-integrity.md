# Φ024 — Evolutionary Integrity (witness pilot)

Standalone successor to Φ023. Reuses its CLI, snapshots and replay protocol without changing them. Adds an external-to-operator-log, single-host witness process and directory with a third Ed25519 role. No production deployment, live Agentora/PhiOS integration or autonomous code mutation.

## Protocol

Trusted config extends Φ023 with witness public key; three distinct Ed25519 fingerprints required. Witness reads candidate operator anchor and canonical snapshot, verifies operator signature, snapshot hash, original trust binding, full Φ023 replay and exact prefix extension by one event. First admission must be empty genesis. Witness-signed record binds witness identity, sequential slot, previous record hash and full candidate. Exact latest duplicate is idempotent; older, forked or skipped candidate rejected. Inspection reconstructs from witness records independently of operator snapshots. The authoritative state for this pilot is the witness view only; Φ023 CLI remains able to inspect or stage unwitnessed state. Do not treat the older CLI as an enforcement boundary. No automatic evaluation, signing, or promotion.

## Persistence and failure model

At most 55 records (genesis + 54 events), max 128 KiB per record; file fsync, no-replace hard link into next sequential slot, directory fsync before acknowledgement, orphan temp ignored. Competing writes to one slot cannot replace it; no claim of full multi-writer serializability or network consensus. Separate witness key path; harness uses same OS account, so actual separation of custody is not enforced. Trust config and witness directory must be protected outside operator/candidate control. The witness rejects operator rollback even if the older anchor is valid. Altered or missing middle record fails closed. A fully deleted suffix of witness records still appears valid; test explicitly demonstrates this known limit. No hardware monotonic counter, remote witness, quorum, key rotation, disk power-loss qualification, filesystem attack protection or external latest-head pin. Operator anchor may lead witness after interruption; operator must explicitly submit exactly next event, no automatic roll-forward. Unwitnessed snapshots are not admitted. No exactly-once evaluator execution claim.

## Reproduce

    node experiments/phi024-integrity-test.mjs

Authoring runtime: 12 pure protocol checks passed with noncryptographic hash/signature test doubles. Node CI exercises actual Ed25519, previous Φ023 CLI, separate witness invocations, wrong key, duplicate, older operator anchor, skipped event, altered/gapped witness records, and two actual SIGKILL boundaries (after temp fsync before link and after link+directory fsync). Tests demonstrate unresolved reservation/explicit abandon and residual witness suffix rollback. Remote CI is separately verified, not assumed. Process kills are not physical power-loss tests.

Next: protect witness head externally with a monotonic service or independent quorum, enforce witness-authoritative evaluation/approval adapters and isolate actual role custody, then integrate the research lifecycle. Earlier experiments untouched.
