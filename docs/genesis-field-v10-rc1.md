# Genesis Field v1.0 RC1 — Finite-domain integrity

Release candidate only. v0.9 validation and prior runtime files remain intact. RC1 reuses v0.3 learning/exchange and v0.8 decision policy. It adds complete 32-point certification of source and recipient candidates, rollback with retained handled-abort events, per-use calibration and a Node HMAC-SHA256 checkpoint envelope.

## Scoped guarantees

A candidate is provisional until every input in the five-bit domain is observed during certification. Repeated contradictory values within an actor/episode cause abort. Only certified candidates enter committed memory. This is exact relative to deterministic stationary truthful observations; no generalization outside the domain, no noisy oracle guarantee. Certification adds 32 observations per candidate. The evaluator separately enumerates all 32 inputs again; these are exhaustive checks, not held-out inputs.

Observation units are reserved before provider invocation. Confirmed responses count as completed; throwing or invalid responses count as uncertain attempted units. A five-pair calibration reserves 10 units; if it fails, all 10 are uncertain, not known physical observations. Packet calls do not consume observation units; no byte or latency estimate. Handled failure or abstention rolls back all candidate memory and maps while retaining trace and cost. Unexpected implementation exceptions and sudden process termination are not journaled. No external provider side effects are rolled back. Bounds: 144 episodes, 192 observation units per episode, 512 packet code units, five million checkpoint characters. The reused selector retains its v0.8 prior and failure penalty; no retuning.

Every peer attempt with a certified source refreshes the five paired anchors, detects changes and charges all 10 units. This is scheduled per-use recalibration, not autonomous inference of arbitrary coordinate maps. Prior historical rules remain tied to their recorded episode coordinates; old term library is a hypothesis hint only and is not migrated to a global frame. Fixed coordinates within each episode assumed.

Canonical event replay reconstructs state, including handled aborted episodes. HMAC-SHA256 protects checkpoint payload integrity/authenticity against an actor without the trusted 32-byte symmetric key. It does not authenticate individual remote oracles, protect against key holders, or prove observation truth. An externally trusted latest MAC pin can reject a different valid signed history; without that pin, rollback/replacement with another valid signed checkpoint is possible. No confidentiality, key rotation, revocation, trusted anchor storage or multi-writer protocol. CLI uses a key supplied in PHIGENESIS_CHECKPOINT_KEY (64 hex characters); never commit real keys. PHIGENESIS_EXPECTED_MAC is optional and must come from an independent trusted source, not the same untrusted file. Unit-test keys are public fixtures only.

## Executed results

Nine new seed-indexed sessions for each of four modes, 12 episodes per session, coordinate changes at episode index six, bias flips every fifth index when peer exchange occurs. 432/432 correct certified target rules, 13,824/13,824 exhaustive predictions, 36 midpoint and 36 final replays. Fixed peer mode refreshed 18 changed mappings and rejected 27/27 corrupted offers. Nine newly constructed sparse faults (selected from inputs not queried by the old local learner and final test), nine internal budget interruptions, nine provider-failure interruptions and nine contradictory-observation cases were all rejected or aborted without admitting knowledge. All 36 fault events replayed. Twelve core checks executed in JS. Separate Node 22.16.0 authentication module smoke checks passed (six assertions, synthetic payloads); integrated auth and disk-level CLI checks are configured in CI, not yet verified at publication.

| Mode | Fully charged observations |
|---|---:|
| Cold | 5835 |
| Memory | 5935 |
| Adaptive | 6368 |
| Peer | 12207 |

No total-cost advantage over cold. This is a new designed benchmark, not independent external research or direct quantitative comparison with v0.9's different session sizes.

## Reproduce

    node runtime/cli-v10-rc1.mjs test
    node runtime/cli-v10-rc1.mjs summary
    node runtime/cli-v10-rc1.mjs gate

The gate intentionally exits 1: crash-durable attempted-work journaling and independent review/trusted key lifecycle remain open. A green diagnostic CI does not mean release readiness. CLI init/step/inspect use authenticated checkpoints, saved by single-writer exclusive temporary file and rename. No fsync or power-loss guarantee; killed processes can lose uncommitted work. The previous v0.9 gate remains unchanged.

Next: journal reserved work before invocation and record completion separately, reconcile pending reservations after restart without pretending they completed, test crash injection, trusted key management and independent acceptance review. No claim of consciousness, general intelligence or self-directed unrestricted mutation.
