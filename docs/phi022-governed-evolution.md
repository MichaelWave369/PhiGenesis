# Φ022 — Governed Computational Evolution (pilot)

Standalone shadow-state governance pilot after Φ021. No actual production promotion, arbitrary code execution by proposals, neural self-modification, Agentora or PhiOS integration. Earlier experiments and RC2 unchanged. The pilot accepts only fixed three-weight configurations. LEARN, RECALL and COMPOSE are finite proposal types, not an implementation of all Φ017–021 algorithms; peer transfer and drift selection remain outside this pilot.

## Protocol

Single trusted host supplies a unique session, distinct operator/evaluator public keys and verification. One pending attempt at a time, at most 18 attempts and 90 events, 972 reserved comparison units per attempt charged at proposal replay even if abandoned. Proposal binds session, monotonic ID, current parent, candidate, mode, source IDs and exact budget. Recall must exactly match a prior node; compose inherits same-index values from admitted ancestors. A receipt is signed by the evaluator over the entire proposal and bounded metrics. Operator signs the exact proposal, receipt (or null for abort), and choice. Approval needs fresh receipt, >=2 total improvement over fixed, no per-context regression. This gate compares to fixed, not incumbent; it is not a sufficient production promotion policy. A rejection can close a pending reservation without evidence; no automatic retry. Approved shadow nodes append; production always fixed. No permissions or code changes. Session uniqueness depends on host. No automatic selection or self-approval.

## Node integration harness

Separate evaluator subprocess with fixed synthetic fixture and 3s timeout, bounded output. Ed25519 signatures with separate ephemeral keys. Evaluator key is sent to trusted child stdin, operator key stays in parent. The parent is fully trusted and possesses both keys; no actual independent principal or OS isolation. Fixed evaluation data is public, not a secret held-out benchmark. Journal snapshot uses exclusive temporary file, file fsync, rename and directory fsync; single writer. In-memory trusted SHA-256 pin detects edits and rollback within this run. No durable external pin, key lifecycle, crash injection, production recovery, concurrent writer safety or cross-platform filesystem qualification. The harness simulates interrupted reservation by reload, not process kill. Temporary files removed on completion. RC2 has more mature crash tests and should inform future integration.

## Reproduce

    node experiments/phi022-governance-test.mjs

Authoring runtime tested the protocol with a role/value equality test double (16 checks). This is not cryptographic verification. The Node harness is configured in CI to exercise real Ed25519, subprocess, persistence, approval, rejection, reservation reload and pin mismatch. Node integration results remain unverified until CI completes. No performance or release-readiness claim.

Next: actual independently controlled keys and external trusted pin, recovery protocol and RC2 compatibility review; separate sealed evaluation sets and incumbent-relative gates; integrate typed adapters to the earlier experiments only after review. No live promotion until external enforcement is independently verified.
