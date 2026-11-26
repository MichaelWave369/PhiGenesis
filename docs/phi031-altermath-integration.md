# Φ031 — Altermath experiential memory bridge

Actual offline source-to-source integration pilot. Imports the existing Φ030 memory restore/run and Altermath Causal Pocket Machine R1 interpreter, with both source revisions pinned for CI. Φ030 PR #42 was still open at branch creation; its own workflow had passed, other checks still running. This branch is based on merged Φ029 and does not assume Φ030 is already on main. No changes to Altermath, Φ030, governance journals, or production.

## Contract

The trusted adapter takes a deterministic Φ030 snapshot, verifies it with its real restore function, accepts an exact numeric query (context 0..2, x/y 0..8, externally supplied tag 0..1), selects only delivered observations with matching context/tag and finds the global minimum Manhattan distance. It partitions all nearest records by generation age (0–3, 4–7, 8+ epochs), retaining sorted observation IDs and per-label vote counts. Pending labels and held-out labels are never supplied to the interpreter. No context inference. For each of three possible labels, constructs an actual Altermath score with three direct-child DELEGATE/OBSERVE/RETURN chains, root COMPOSE sum, FINISH; 11 events and 11 fuel, allocated 16, per score. Explicit grants allow only these scalar observations, child returns, root sum and finish. No arbitrary instruction input. Total 33 interpreter events/fuel per retrieval. Unique plurality returns label, ties and empty evidence abstain. Counts and result checked against direct flat oracle; report exact replay checks all output fields including receipts. Altermath receipts are hash chains, not signatures; they do not independently authenticate observation truth. Adapter computes nearest distances and vote counts itself; interpreter aggregates them, not a new learning algorithm. No efficiency advantage claim; overhead deliberately measured in interpreter fuel, not equivalent to comparison units. Age partitions are fixed experimental choices; context tags supplied. No live PhiMemory9, PocketMesh, Agentora or PhiOS integration.

## Source pins

- PhiGenesis: ccbf26b8b5ce2e0570641875ac3c2d11ab8a8f33 (PR #42 head), experiments/phi030-memory.mjs.
- Altermath: 99a40f6f8e6f4ded656dd3655778dfffa72a3754, src/causal-belt.mjs.

CI checks out both exact commits into separate folders, verifies HEADs and invokes actual modules under Node 22. Public source checkout requires network at CI setup; execution is offline and no external services or keys used. Local reproduction with equivalent pinned checkouts:

    node experiments/phi031-altermath-test.mjs /path/to/PhiGenesis/experiments/phi030-memory.mjs /path/to/Altermath/src/causal-belt.mjs

Authoring runtime: actual fetched source logic evaluated with SHA-256 test double (not real cryptography), 390 assertions, 96 retrievals, 8 nonempty tie abstentions, 38 empty evidence cases, 3168 primary interpreter events. Tests independent flat vote oracle, deterministic replay, receipt and report modification, snapshot tamper, denied grant, insufficient fuel and cross-pocket data refusal. Real Node imports and SHA-256 await CI. No benchmark accuracy or production security claim. Source pins provide reproducibility, not independently reviewed security. No durable witness/accounting integration or authenticated memory receipts. Next: bind typed reports and source revisions to provenance, and inspect Agentora's existing interfaces before integrating.
