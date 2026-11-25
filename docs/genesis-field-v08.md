# Genesis Field v0.8 — Unified relational architecture

A bounded event-sourced integration runtime. Uses actual v0.3 finite learners and verified exchange, with a new temporal cost and information-value policy inspired by v0.6/v0.7 rather than calling those batch-level policies directly. Earlier runtimes are unchanged. Three local in-process agent states A, B, C retain their own histories and term libraries across episodes. No LLM, network, packages, arbitrary code execution or autonomous deployment.

## Common event protocol

A pure decision uses previous episode costs/status only. Modes: cold, memory, peer, adaptive. Adaptive initially tries each strategy, then minimizes an elapsed-time-weighted cost estimate (12-episode half-life, weak prior .5 at cost 30). A fixed two-point uncertainty proxy and 12-episode horizon may prioritize a non-greedy alternative; one probe token accrues per six episodes. Failed acceptance adds a fixed cost penalty of 128 to the estimate, not to measured observation counts. Parameters are externally chosen, not calibrated.

Each step is a bounded transaction returning a new state. The provider supplies binary observations, paired one-hot anchors and a received packet. For peer steps a sender is selected by episode parity (A or B), learns a fresh source relationship, verifies three separate test observations and retains the accepted source. First successful source use calibrates its map to C; fixed coordinates are assumed for the entire session and calibration is reused. Recipient audits the packet and falls back to local learning if rejected or malformed. All recipient candidates must pass the additional three-point test before admission; failed test leaves recipient library and relation record unchanged. Cold discovery does not use prior terms, but stores newly verified terms for subsequent mode choices. Local and peer accepted rules carry world ID, origin, method and episode index. Source history and its evidence are available through the event log. No unverified rule promotion.

The schema-8 checkpoint contains seed, mode and canonical events, including every binary observation (actor, stage, input, output), paired calibration anchors and offered/received packets. Replay re-executes the chosen strategy from the transcript, checks event/derived-record equality and reconstructs all agent memories and calibration. No hidden truth is stored in the ledger. Invalid provider observations throw before committing any new state; this does not undo external provider side effects. Checkpoint replay checks internal consistency, not authentication or trust in observations. A forged internally consistent log may be accepted. Checkpoints occur at episode boundaries, not mid-episode. The provider and public state objects are trusted local interfaces, not an adversarial sandbox.

Bounds: 144 episodes, 128 observation units per episode, 512 received string code units, 4 MB checkpoint character cap, underlying learner's 48-observation limit. Calibration charged ten endpoint observations for five paired anchors. Wire count is ASCII serialized anchor/received-packet length for benchmark messages, not general UTF-8 or transport accounting. Source acquisition, source/recipient validation, peer audit, local fallback and calibration charged in full. Three verification inputs used at admission are not untouched test inputs for the whole integrated runtime; external evaluator enumerates all 32 inputs separately, including already observed ones. Exact support recovery also independently checked.

## Executed benchmark

Nine deterministic seed-indexed sessions per mode, 36 episodes per session, with distinct source/recipient coordinate permutations fixed within each session. Quadratic target rules use the designed finite family. Every seventh episode has a simulated bias flip if a peer offer is made. All modes evaluated against the same deterministic environments; evaluator has access to true rules, selector does not. Across 36 sessions: 1296/1296 exact target recoveries and 41472/41472 exhaustive input predictions, 36 mid-session replay checks and final replay of all sessions. Twelve core checks executed, including invalid observation atomicity, corrupt packet rejection/fallback, calibration reuse, contradictory admission test, derived-record tampering and observation accounting.

| Mode | Source | Recipient | Calibration | Total |
|---|---:|---:|---:|---:|
| Cold | 0 | 8120 | 0 | 8120 |
| Memory | 0 | 8128 | 0 | 8128 |
| Adaptive | 455 | 7923 | 90 | 8468 |
| Peer | 8392 | 5707 | 180 | 14279 |

Adaptive selected cold 169, memory 138, peer 17 times, with 45 deliberate probes. The fixed peer mode rejected 54/54 injected corrupted offers and recovered the targets by local fallback. Adaptive encountered no injected corruptions on its selected peer episodes. Adaptive costs 4.29% more than cold, so no overall efficiency gain is established. Peer reduces recipient-only observations but costs more when charged for fresh acquisition. This is an integration smoke benchmark, not a pre-registered independent confirmatory experiment. Finite designed grammar, noiseless oracle outside explicit fault checks, fixed alignment, no general OOD detection, no statistical independence claim. No compute or wall-time efficiency claims.

## Reproduce

    node runtime/cli-v08.mjs test
    node runtime/cli-v08.mjs summary
    node runtime/cli-v08.mjs init field-v08.json 12345 peer
    node runtime/cli-v08.mjs step field-v08.json
    node runtime/cli-v08.mjs inspect field-v08.json

Node 22, no packages. Complete per-session results committed. CLI uses exclusive temporary file and rename (single writer; no fsync, concurrent writer protection or power-loss guarantee). Cross-process CI checks same-state reconstruction; pending remote verification at publication. This runtime does not yet integrate all original nine experiments, especially learned signaling, symbol induction, and operator construction beyond the finite rule family. No independently operating networked peers or authenticated provenance. Next: v0.9 independently specified acceptance suite with drift in coordinates, unsupported functions, budgets and explicit ablations of memory, exchange and inquiry; measure failure/abstention as well as costs.
