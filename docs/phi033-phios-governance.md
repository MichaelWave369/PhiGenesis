# Φ033 — PhiOS Covenant governance intake (offline pilot)

Imports actual PhiOS Covenant CR-01 and Mandala AuthorityProjection, actual Φ032 export/stage, actual Agentora SQLite planning interfaces and Altermath R1. No external repo changes. CI pins the four source revisions, including a separate pinned Φ032 checkout for the source manifest; current adapter is from the PR checkout. No live runtime execution, tool calls, workers, grants, or production writes. Scratch DB creation is an explicit test-host operation before review, not an effect authorized by Covenant.

## Boundary

The bridge validates Φ032 packet and its digest, observes the actual pending scratch run, plan, four subgoals, agent tool/memory configuration and three open restricted handoffs; binds their IDs and packet digest. This is bounded observation of draft state, not proof that no side effects occurred anywhere. Uses actual IdentitySeal with a digest of adapter source and enumerated source artifact manifest; issuer and key ID are descriptive, unsigned, untrusted provenance. Manifest pins are explicit; CI verifies checkout HEADs, not a full source attestation or runtime supply-chain manifest. Hashes only enumerated files, not all dependencies. Adapter computes manifest from trusted roots and binds it into report; it does not verify a trusted pre-existing file digest inventory.

Real AuthorityProjection uses an empty ceiling and no authoritative events, at a fixed illustrative timestamp (not a claim of current live permissions). No permissions are minted from evidence. Real BoundaryContext, BoundaryTransitionRequest and BoundaryTransitionReceipt describe EXTERNAL → INTAKE → IDENTIFIED → BOUNDED with accepted descriptive checks; BOUNDED → GOVERNED_EXECUTION is always HELD. No ROOT transition, no skip, no execution circle, no action or execution authority. These are Covenant records, not an enforcement hook into the PhiOS Spine. The bridge supplies the prerequisite judgments; CR-01 is not itself an independent dynamic evaluator. Reconstruct strict typed records and rerun entire review against scratch DB and current source files for replay check. No automatic approval or promotion. No live PhiOS identity, permission or state store.

## Verification

CI runs the real Φ032 Node export using pinned Altermath, actual Agentora planning on disposable SQLite and actual PhiOS Python contract imports. Twelve intended reviews, 36 accepted descriptive transitions, 12 held execution transitions. Test targets packet authority injection, forged execution status, modified receipt and draft, bad pins, ROOT/skip refusal, actual handoff permission drift, grant above empty ceiling, and independent database session replay. Python integration and actual cryptography are unconfirmed at authoring; do not claim tests passed until CI. Static inspection used exact dependency source. No authenticated external witness, independent key custody, trusted runtime attestation or integration with Φ028 work ledger. PhiOS modules imported via pinned checkout; only Agentora declared SQLModel/pydantic-settings installed, transitive versions not locked.

Source pins: PhiGenesis 22114dc95ee56b49cd23a5eeff1b8a0a3d1d972e; Agentora 49166bb5365975d68df744678f91a837b0da48f2; Altermath 99a40f6f8e6f4ded656dd3655778dfffa72a3754; PhiOS da87f8fe7d26036a61a97aca6eebc2afc2a747c3.

Reproduce with matching local checkouts:
    node experiments/phi032-export.mjs ../Altermath/src/causal-belt.mjs > /tmp/phi033.json
    PYTHONPATH=../Agentora/server:../PhiOS python experiments/phi033_phios_test.py /tmp/phi033.json ../PhiGenesis-pinned ../Agentora ../Altermath ../PhiOS

Next: Φ034 integrated field validation, fail-closed dependency and witness gates, explicitly separate verified evidence from actual authority. Prior research untouched.
