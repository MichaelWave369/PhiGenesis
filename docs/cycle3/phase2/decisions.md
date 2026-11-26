# Phase II build boundary and acceptance contract

Baseline: PR #47 merged at `10a9785c5a2dfacca547b275b82c8295a4d37e8e`.
Its tree is identical to `6ed6e12b140af85241392c776175c3ed798daa8d`.
All 41 merge-head CI jobs and the 19 current local Cycle III tests passed.
The Phase II mission in this directory controls the work. No root license is
selected. No production witness, remote service, live inference or worker is enabled.

1. **Continuity:** reuse NBGPocketMesh's existing external-anchor storage,
   nonce-bound Ed25519 handler and verifier. A new research-domain checkpoint
   binds the whole session/configuration/manifest/artifact inventory to that
   opaque anchored digest. The local reference witness is explicitly same-host.
   A caller supplies the transport and current public trust policy; recovery
   never imports trust or permissions from its own evidence. Rotation/revocation
   are operator policy changes, not candidate operations. Alternatives considered:
   Φ029 quorum (fixed legacy journal/roles, honest-witness assumptions), protected
   single anchor (narrow compatible digest contract), hardware monotonic storage
   (unavailable). Choose the single-anchor interface for this local increment;
   independent administration and protected storage remain deployment blockers.
2. **Native memory:** use PhiMemory9's existing read-only SnapshotReader connection
   and native MemoryEngine/EvidenceLedger/retrieval methods. Do not invoke their
   schema-creating constructors on a source DB. Require an explicit source digest,
   a consistent read transaction, bounded complete provenance and no active WAL.
   Export metadata/digests rather than private content. Native creation time is
   admission time; unsupported observation/expiry/availability semantics remain
   explicit operator declarations or unknown. Missing/conflicting evidence stays held.
3. **Runtime:** retain the v1 protocol and six adapters. Add an explicit v2 profile
   in the same journal/session engine, with a documented v1-core compatibility
   projection and bounded appended activities. Never rewrite a v1 journal.
   Reserve/start each activity before reading the source DB or contacting a
   supplied witness callback. Separate new logical resource dimensions.
4. **Source overhead:** evaluate caching only the authenticated tracked-path
   inventory. Re-hash all covered bytes before and after work; recheck revisions,
   dirty state, untracked sources and the own-source tree. Do not cache content
   hashes or trust timestamps. Measure against the unchanged path; report null
   or adverse measurements honestly. This is drift detection under the existing
   trusted-host model, not prevention of hostile transient filesystem replacement.

Acceptance: stale/forked/truncated/substituted checkpoints refuse; duplicate
submissions are idempotent; witness absence and current-key revocation refuse;
actual process interruption preserves unresolved accounting. Native intake must
perform no source writes, preserve distinct IDs/ancestry/evidence/conflicts,
reject authority fields and changed source bytes, handle temporal/context/lifecycle
holds and saturation, and reconstruct exactly after cold start. Hosted Windows
tests establish only their executed software contracts, never hardware or
power-loss qualification. Independent scientific evaluation remains outstanding.
