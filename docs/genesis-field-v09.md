# Genesis Field v0.9 — Validation and experimental integrity

This is a validation harness for the unchanged v0.8 integrated runtime, not a production release or a ninth implementation of the learner. It uses new deterministic seed schedules, separately written arithmetic oracle and coordinate decoder, and explicit fault witnesses. It is authored by the same computational collaborator, not independently reviewed or preregistered. No external packages, LLM, network or arbitrary execution. Previous runtime files unchanged.

## Protocol and in-family results

Nine seed-indexed sessions per mode (cold, memory, peer, adaptive), 18 episodes per session, with either unchanged coordinate maps or a fresh permutation per actor at episode index 9. Every fifth episode (zero indexed) flips a peer packet bias if an offer occurs. The evaluator separately enumerates all 32 inputs per accepted rule. This includes observed inputs, so it is not 32 held-out observations. Independent oracle implementation does not imply independent researchers or statistically independent samples.

72 sessions, 1296/1296 correct supported rule recoveries, 41472 exhaustive checks, 72 midpoint replays and 72 final replays. No in-family false accepts or abstentions. Costs count source, recipient and calibration observations on completed episodes.

| Mode | Fixed coordinates | Drifting coordinates |
|---|---:|---:|
| Cold | 4050 | 4051 |
| Memory | 4184 | 4140 |
| Peer | 7447 | 8151 |
| Adaptive | 4367 | 4342 |

Mode comparison is not a clean factorial component ablation: the modes retain different histories and incur different work. No adaptive efficiency advantage demonstrated. In fixed peer mode post-midpoint rejection count rises from 18/81 to 78/81 under coordinate drift. Both conditions include injected corruption. Local fallback recovered all supported targets; calibration was reused without repairing the stale map. Adaptive selected peer only nine times per condition, none after the midpoint, so this benchmark does not establish its ability to detect or adapt to coordinate drift.

## Fault witnesses

- Unsupported cubic controls: all ten degree-three single monomials, both biases and four modes, 80/80 abstentions. Adaptive starts cold, so those cases duplicate cold behavior. These are 20 distinct functions, not 80 independent unknown families.
- Sparse blind spots: nine clean cold episodes; evaluator finds an unobserved input from the clean trace and flips only that recipient output, leaving the rest of the function unchanged. This intentionally constructed out-of-family attack uses evaluator knowledge, not a representative random distribution. All nine false accepted. Independent full enumeration finds exactly one mismatch in each case, at 32 additional observations per case. This certificate is evaluator-only, not implemented as a runtime admission safeguard. For deterministic stationary five-bit functions exhaustive certification is feasible; no implication that exhaustive verification scales.
- External five-observation budget: nine attempts interrupted after five actual provider calls. All original state objects remain unchanged, but all nine aborted attempts have no committed cost/evidence record in schema 8. Provider side effects are not rolled back. This tests an externally enforced cap, not exhaustion of the runtime's internal 128-unit limit.
- Contradictory admission: all nine cases flipping the final three test observations abstain and do not admit recipient knowledge.
- Record mutations: nine modified cost records and nine invalid trace inputs rejected by replay. Nine alternative internally consistent histories (constructed from a complemented oracle) replay successfully. Replay is consistency checking, not authenticity. This demonstrates the existing trust-model limitation, not a cryptographic exploit.

## Gate and interpretation

Eleven diagnostic checks pass, including checks that deliberately reproduce known defects. Green CI means the benchmark is reproducible and these limitations remain visible; it does not mean the release is ready. The explicit gate returns exit code 1 with three blockers: sparse false acceptance, unrecorded aborted work and lack of authenticated history. The CI verifies that blocked state deliberately. The gate is a research readiness signal for stronger integrity requirements, not a claim that cryptographic authentication can prove the external oracle is truthful. Coordinate recalibration remains an additional follow-up requirement.

## Reproduce

    node runtime/cli-v09.mjs test
    node runtime/cli-v09.mjs summary
    node runtime/cli-v09.mjs gate

Node 22, no packages. The gate currently fails intentionally. Full per-session and fault-witness records in results/genesis_field_v09.json.

## Next

Prioritize a bounded certification/admission path that distinguishes exact finite-domain certification from provisional evidence, an attempted-work ledger with durable abort events and explicit resource accounting, and trusted-source authentication with clearly scoped guarantees. Add map invalidation/recalibration when evidence contradicts prior mappings; compare costs against fallback. Preserve failing witnesses as regressions. Only then evaluate a v1.0 candidate against fresh tests. No general intelligence, subjective experience, or unrestricted self-modification claim.
