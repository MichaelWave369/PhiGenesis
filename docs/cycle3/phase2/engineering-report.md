# Operation Genesis Ascension — Phase II engineering report

Prepared November 26, 2026. This report continues the [merged Cycle III
foundation](../engineering-report.md) under the [Phase II controlling
mission](controlling-mission.md). The [decisions](decisions.md) and [internal
evaluation contract](evaluation-contract.md) were written before their respective
implementation/comparative measurements. This is local engineering evidence,
not independent scientific verification or production authorization.

## Result and status vocabulary

Implemented three connected additions in the existing session engine: a
nonce-verified research checkpoint using actual PocketMesh anchor code; a
read-only adapter over actual PhiMemory9 SQLite/evidence/retrieval APIs; and a
finite, non-executable relational genome with reproducible transformations and
exact parent reconstruction. The explicit v2 profile keeps the original six core
operations and appends bounded, reserved/accounted activities. Earlier experiment
formats, results and v1 session bytes are preserved.

**Production remains BLOCKED.** The reference witness shares the local
administrator; coordinated rollback defeats it. No independent administration,
authenticated production publisher, hardware monotonic custody, full physical
resource accounting, independent developmental benchmark or full native Windows
session qualification is established. No model, inference provider, worker,
listener, remote service, permission grant, merge or deployment is activated.

Status meanings used throughout:

| Label | Meaning in this report |
|---|---|
| VERIFIED | Actually reproduced software behavior at the stated scope |
| IMPLEMENTED — UNVERIFIED | Code/config exists but the named environment or integration has not executed |
| SIMULATED | An authored synthetic workload or finite software model, even when its implementation passes tests |
| PROPOSED | Designed future work without an executed implementation/result |
| BLOCKED | A material external prerequisite or qualification is absent |
| FAILED | An observed run or hypothesis failed; not erased by a later passing control |

## Verified starting point and ecosystem inventory

PR [#47](https://github.com/MichaelWave369/PhiGenesis/pull/47) was verified merged.
Its published head was `6ed6e12b140af85241392c776175c3ed798daa8d`; the current
main/merge baseline was `10a9785c5a2dfacca547b275b82c8295a4d37e8e`.
`git diff` between those trees was empty. All **41 check-run job records at the
merge head** concluded success. The original 19 local Cycle III tests passed
before editing. No additional main-branch changes since that merge were observed.
Receipts: [remote baseline and related work](verified-baseline.json), [local
starting tests](baseline.json). These counts are jobs/tests respectively, not
interchangeable totals.

The following default-branch observations were refreshed for this continuation.
An inspected repository is not automatically a runtime dependency or a verified
production integration.

| Repository | Observed main SHA | Phase II role and classification |
|---|---|---|
| PhiGenesis | `10a9785c5a2dfacca547b275b82c8295a4d37e8e` | VERIFIED starting code; all changes in this PR belong here |
| PhiOS | `43620d38d6164b3579d61784cdb140462501ff1f` | VERIFIED source inspection of Covenant recovery/trust mechanisms; existing adapter retains historical pin below |
| Altermath | `99a40f6f8e6f4ded656dd3655778dfffa72a3754` | VERIFIED actual Causal Belt compiler/ABL semantics; no genome executor |
| Agentora | `49166bb5365975d68df744678f91a837b0da48f2` | VERIFIED existing plan/handoff path retained; live roles BLOCKED |
| PhiMemory9 | `5cba675a3a439023a3ff374c238dd6e4339e3a55` | VERIFIED actual read-only intake and 124 native tests; fixture experience SIMULATED |
| NBGPocketMesh | `0687f10970989194d4af554d9b189c7ce8a1ad15` | VERIFIED actual R11 anchor handler/verifier and R2 address mapper; topology workloads SIMULATED |
| NestedBubbleGear | `41cf5be77cdd9958db55ae8de4bab559f30d79e0` | IMPLEMENTED — UNVERIFIED as an integrated dependency; finite relational/provenance research inspected |
| PhiDevelopmentalIntelligenceMesh | `a6b92c9fc98f81940da6598adf61f280f70337ae` | IMPLEMENTED — UNVERIFIED bridges inspected; not imported |
| PhiDiscovery | `bb51df2fa556e9df1dba5bf14528ae725fc0fbc1` | IMPLEMENTED — UNVERIFIED evidence/review interfaces inspected; not invoked |
| PhiBuddy | `5832141379174938bdd4d5487c698e228ccb9537` | IMPLEMENTED — UNVERIFIED local Rust/SQLite/provider interfaces; no inference invoked |
| PhiShieldNetwork | `b3c2ed4ea841137a2ba8f7a1e650fcf5eb203533` | Main/README inventory verified; integrated defense IMPLEMENTED — UNVERIFIED, simulation claims preserved |

All named repositories already exist; none was created or changed to make this
increment appear integrated. Relevant open work remains PhiOS
[#340](https://github.com/MichaelWave369/PhiOS/issues/340), Agentora's nine open
issues including [#124](https://github.com/MichaelWave369/Agentora/issues/124) and
[#75](https://github.com/MichaelWave369/Agentora/issues/75), and Altermath draft
research [#31](https://github.com/MichaelWave369/Altermath/pull/31), head
`d6b3c38f4d58e380fda63284da68c76e947b3904`. PhiGenesis had no open issues/PRs
at the baseline query. No issue closure is claimed.

### Exact runtime dependency boundary

| Runtime root | Required SHA | Reason |
|---|---|---|
| PhiGenesis historical manifest source | `22114dc95ee56b49cd23a5eeff1b8a0a3d1d972e` | Preserve Φ033's existing native manifest contract; separate from this candidate's own source inventory |
| Agentora | `49166bb5365975d68df744678f91a837b0da48f2` | Existing isolated pending plans/handoffs |
| Altermath | `99a40f6f8e6f4ded656dd3655778dfffa72a3754` | Existing interpreter and new fixed compiler mapping |
| PhiOS | `da87f8fe7d26036a61a97aca6eebc2afc2a747c3` | Preserve audited denial/review adapter ABI |
| PhiMemory9, v2 only | `5cba675a3a439023a3ff374c238dd6e4339e3a55` | Native memory/evidence read methods |
| NBGPocketMesh, v2 only | `0687f10970989194d4af554d9b189c7ce8a1ad15` | Native signed anchor and finite addressing |

Node standard libraries and the existing [locked adapter Python package
closure](../../../runtime/cycle3/requirements.txt) suffice. Native memory adds
no package dependency. Setup is explicit; runtime installs nothing. Local tests
used Linux, Node `v24.22.3` and Python `3.12.14`; hosted CI config uses Node 22
and Python 3.11. Interpreter/wheel binaries and the OS account are not attested.
The legacy research suite separately needs root `requirements.txt` (NumPy).

No root LICENSE exists in the baseline. None is selected here. An explicit owner
licensing decision remains BLOCKED for a future open-source-licensed release;
existing dependency licenses remain applicable. No dependency implementation is
copied into PhiGenesis. Private PhiKernel/TIEKAT internals are not imported.

## Integrated architecture and versioning

The existing `session.mjs`/RC2 HMAC journal remains the sole session engine.
`PhiGenesis.CycleIII.v1` keeps its exact four-root profile, protocol and six core
adapters. Explicit `PhiGenesis.CycleIII.v2` adds the two named roots and bounded
`PhiGenesis.CycleIII.Activity.v1` records after the six core operations settle.
It does not silently convert existing journals or migrate Φ030 snapshots into
native memories. Unknown versions fail closed.

For v2 semantic replay, `activities.mjs` explicitly projects the declared v1 core
into the unchanged core validator, then checks the extension. The disk reader
authenticates the **original** HMAC record bytes first; no historical signature or
record is rewritten. A strict Φ033 four-root validation failure was caught in
the first v2 smoke run. The correction explicitly selects those four historical
roots only when calling that legacy adapter, while v2 source verification still
covers all six. The historical validator was not weakened.

Each activity reserves a bounded request, current journal position/head and
resource vector, then durably starts before native reads or witness calls.
There is one local writer lock, at most nine activities and at most 64 records.
Results are immutable digest-bound artifacts; their category partitions and
per-dimension accounting are checked during replay. Interrupted starts remain
uncertain. Inspection invokes no adapter. Explicit abandonment is terminal;
work is not automatically retried or readmitted. Unlock requires the inspected
lock digest and a dead PID, retaining the original trusted-host assumptions.

The generic RC2 storage gained a read-only `heads` copy of already validated
HMAC chain heads, so checkpoint prefixes can be inspected without a second log
format. Its storage format is unchanged; its crash suite was rerun.

## Φ037 — research checkpoints using native PocketMesh

Implementation: [continuity.mjs](../../../runtime/cycle3/continuity.mjs) and the
activity/session integration. Existing Φ028 attempted-work and Φ029 quorum
contracts, RC2 storage, PocketMesh R11/R12/R13/R14/R15 interfaces, and current
PhiOS Covenant identity/recovery and trust-operator boundaries were inspected.
Φ029's fixed legacy roles/schema and honest-witness assumptions do not supply
independent administration to a new session. PhiOS identity/recovery receipts
explicitly carry no authority; its local trust operator manages a different
execution-manifest authority domain. Neither is relabeled a production witness.

The chosen narrow reuse invokes PocketMesh's actual `initializeExternalAnchor`,
`advanceExternalAnchor`, `inspectAnchor`, `createReadOnlyAnchorHandler` and
`verifyExternalAnchorProof` from `src/pocket-external-anchor.mjs`. Full research
checkpoint bodies are stored alongside its opaque digest anchor. R11's
`policyEpoch` slot is explicitly used as the research checkpoint sequence, and
its witness-digest slot holds the research checkpoint digest. This mapping
imports no PocketMesh permission or production gate approval.

| Checkpoint binding | Actual representation |
|---|---|
| Research identity/version | Session UUID and exact v1/v2 protocol |
| History | Exact position, HMAC head and previous checkpoint digest/sequence |
| Implementation/config | Source hash, runtime manifest hash, configuration digest |
| Evidence | Digest inventory of artifacts at the settled protected prefix |
| Current trust | Witness ID, key ID, Ed25519 SPKI fingerprint, policy epoch/digest |
| Authority | `NONE`; operational/execution authority false; release `BLOCKED` |

The caller supplies a transport and current public trust policy. The local
reference calls the real native handler **in-process** and never opens an HTTP
or mTLS listener. Fresh 128-bit nonces and current-key verification prevent
cached-proof fallback; any supplied conflicting/invalid proof refuses the read.
Up to three proofs may be checked, but this is **not a quorum/BFT protocol**.
All witness calls have bounded deadlines. A timeout requests abort, yet cannot
prove cancellation, remote completion or expenditure; the activity stays uncertain.

Policy rotation is an explicit operator epoch/key change followed by a new
checkpoint. Substituted/revoked/old-current keys refuse current continuity.
Historical HMAC replay remains descriptive; recovery never loads authority or
current trust from a stored checkpoint. A changed current policy may make an old
checkpoint unavailable until explicit operator repair/new qualification.

Immutable publication uses a flushed temporary file and no-replace hard link;
the native anchor advances only afterward. Actual SIGKILL tests at both windows
require exact explicit resubmission, which completes the existing checkpoint
idempotently. An interruption after the witness commits but before the session
records its result leaves the operation uncertain; fresh read-only verification
can still qualify that prefix without retrying work or inheriting authority.

**VERIFIED locally:** duplicate submission, fresh proof, stale checkpoint,
valid-prefix rollback below the floor, truncation, fork, substituted session,
manifest/config/artifact inventory, challenge replay, invalid/conflicting proofs,
unavailability, timeout, key substitution, rotation/revocation and actual process
interruption. The final demonstration has **31 records; its second checkpoint
protects 28**, leaving its own three accounting records unprotected. A valid
extension above a protected floor is permitted. This is not protection of every
current suffix or proof of wall-clock history.

**FAILED trust hypothesis:** a common administrator can roll back both local
stores and the current trust state; the coordinated-rollback test demonstrates
that the old history then verifies. Separate directories, processes or generated
keys do not create independent custody. The reference also assumes a trusted
publisher; R13 client authentication is not implemented by this adapter. Genuine
independent administration, protected policy/key storage, authenticated publisher
transport, anti-rollback deployment and operational key recovery remain BLOCKED.

## Φ038 — actual PhiMemory9 read-only intake

Implementation: [native_memory.py](../../../runtime/cycle3/native_memory.py) plus
the fixed isolated `native_worker.py`. It uses the pinned native
`SnapshotReader._connection()` (read-only URI/query-only), actual
`MemoryEngine.verify/lineage/events`, `EvidenceLedger.audit/export`, and
native lexical/ancestry `retrieval.search`.

Native constructors create schema, so the adapter intentionally binds pinned
read methods to the already read-only connection without invoking those
constructors. This is a version-coupled private-interface dependency, not a new
general PhiMemory9 public API. Exact pins, schema/column checks and native tests
guard it. A future native read-only public facade would reduce this coupling.

Intake requires an explicit absolute regular offline database and reviewed
SHA-256, a consistent read transaction, before/after file hashes, no active
nonempty WAL/rollback journal, complete expected evidence schema and successful
native integrity checks. A source DB is never repaired, consolidated, compacted,
renewed, forgotten or otherwise written by intake. Native renewal/retirement
history is read as it exists. Capacity saturation refuses rather than truncating
the provenance graph.

| Memory property | Preserved representation and actual boundary |
|---|---|
| Identity/context | Distinct native memory/blob IDs; duplicates remain distinct records |
| Revision/ancestry | Latest native event ID (typed revision reference), parent ID, exact native lineage, event IDs/times/detail digests |
| Source/evidence | Native source pointer/IDs, registered source metadata/row digests, claim/link/conflict identities and digests |
| Content consistency | Native fingerprint and full-record digest; no raw memory text or claim statement exported |
| Admission time | Native `created_at`; not reinterpreted as observation time |
| Observation/classification | Explicit operator declaration or unknown/unreviewed; observed/derived/hypothesis/missing labels do not prove truth |
| Lifecycle/contradiction | Active/retired, superseded holds, native challenge links and conflict IDs |
| Temporal/source admissibility | Delayed, future, stale, expired, unavailable/revoked/unknown and missing-source holds remain explicit |
| Authority | `NONE`, action/execution false; no permissions or grant conversion |

Native source registries do not provide independently authenticated observation
time, expiry or current source availability. The optional overlay labels these
as **operator declarations**, never native revocation enforcement. Without
declarations, time/availability stay unknown and records are held. Eligibility
means passing this intake policy, not factual correctness; a hypothesis remains
a hypothesis even if admissible for retrieval. A null context is unscoped, not
inferred context. Context changes are explicit requests and do not migrate data.

Bounds are 8 MiB/database, 72 memories/blobs, 900 memory events and additional
finite evidence-table ceilings. A before-execution SQL guard limits forwarded
statements to 3,000; its test confirms that an exhausted budget prevents the next
statement and leaves source bytes unchanged. Fixed native connection setup and
rollback/connection teardown are outside this forwarded-statement counter.
Native retrieval requests the whole bounded candidate pool before filtering
admissibility, avoiding a truncated top-k prefix that hides eligible records.

**VERIFIED:** all 16 Python adapter tests passed, including delayed/missing/
duplicate/conflicting/stale/expired/revoked/unavailable evidence, capacity,
context changes, renewal ancestry, digest/schema/authority substitution, SQL
ceiling, unchanged DB bytes and exact cold reconstruction. The Node integration
also reconstructs the artifact through a fresh isolated Python process from the
same approved DB/request. The native PhiMemory9 suite separately passed 124 tests.
The final disposable native fixture has seven memories: two eligible and five
held; two source records, two claims, one conflict and one duplicate group.
Holds overlap: two contradictory, two context-mismatched, one superseded and
one missing-source record.

This is actual native API/SQLite integration on **SIMULATED authored experience**.
It does not replace Φ030's numeric learner, ingest a private user DB, prove
long-term learning or establish real-world retrieval superiority. Metadata,
source locators and hashes can still be sensitive; only synthetic compact
receipts are committed, not native DBs or private memory contents.

## Φ039 — finite relational genome

Implementation: [genome.mjs](../../../runtime/cycle3/genome.mjs). The schema is
`PhiGenesis.RelationalGenome.v1`; it is descriptive data, never executable code.
Actor identity comes from the session, implementation identity from the manifest,
and the control digest from the source/config-bound session. Pocket IDs remain
stable while topology changes. Native memory references bind IDs to current
record digests. Ancestry/evaluation digest references and evidence requirements
are bounded metadata, not evaluator selection or approval.

Fixed ceilings: **36 pockets, 72 typed relationships, depth six, nine native
memory refs per pocket, nine ancestry/evaluation/evidence refs**. The integrated
runtime deliberately starts from three pockets (`root`, `a`, `b`) and exposes no
dynamic pocket creation. One stable root, unique IDs, finite parent paths,
supported types (`supports`, `challenges`, `depends`) and acyclic relation graphs
are required. Orphans, cycles, conflicting support/challenge pairs, duplicate
edges, unknown refs, changed authority/control/ceilings and overflow refuse.

| Semantic category | Existing implementation and this increment's status |
|---|---|
| CREATE | VERIFIED fixed seed construction; general dynamic CREATE remains PROPOSED and is refused as an opcode |
| RELATE | VERIFIED fixed typed seed edge/validation; dynamic RELATE is PROPOSED/refused |
| NEST | VERIFIED bounded metadata reparenting with depth/cycle/root checks |
| ROTATE | PROPOSED; no justified graph rotation semantics, explicitly refused |
| REVERSE | VERIFIED reversal of one typed directed edge; validation reruns |
| FOLD / UNFOLD | Altermath ABL R0 actually supports bit-summary/exact residual reconstruction; genome topology folding is PROPOSED/refused |
| COUPLE | PROPOSED at genome level; no invented equivalence to mesh routing or authority exchange |
| COMPOSE | VERIFIED same-ID pocket memory-ref union from a recorded ancestor; distinct from native Causal Belt's numeric child-result COMPOSE |
| OBSERVE | VERIFIED native compiler accepts a fixed root pocket-count observation shape; no genome observation executor |
| RETURN | Existing ABL/Causal Belt return semantics inspected; genome return/execution is PROPOSED/refused |
| RECALL | VERIFIED restoration of pockets/relations from a recorded ancestry digest |

Each accepted candidate preserves its parent and emits parent/candidate/
operation/ancestor/control/ceiling digests with an undo snapshot. Reconstructing
the parent restores its exact prior pockets, relationships and ancestry list.
Reversing an edge twice restores its relationship structure while intentionally
adding transformation lineage; that is not claimed as equal full candidate bytes.
The runtime admits ancestors only if their exact configurations were already
recorded in this journal. No identity laundering or remote ancestry is inferred.

Qualification invokes actual Altermath `compileCausalScore` on a **fixed**
OBSERVE/FINISH count shape and actual Mycelium R2 `pocketAddress` for finite
ordinal IDs. No compiled score is executed and no mesh routing occurs. Addresses
do not establish actor identity or prove that a genome implements a topology.
The final NEST fixture moves `a` to `root/b/a` with actor identity unchanged;
22 defined graph visits are counted. Six pure graph tests plus integrated
mapping/refusal/accounting tests pass. Learning/evolution benefit is PROPOSED.

ABL FOLD retains the original bit string in a checksum-bound residual; its summary
view is not lossless compression without that residual, unlimited storage,
physical holography or evidence that a graph fold can be reversed. No such
semantics are added here.

## ΦMycelium and topology investigation

The existing R0–R8 sources provide finite synthetic routing (R0), bounded growth
and policy comparison (R1), procedural addresses/overlays (R2), regeneration (R3),
topology repair comparisons (R4), bounded circulation with an ABL projection
(R5), local ledger reconstruction/reconciliation (R6), snapshot-bound trials
(R7) and offline reserved orchestration (R8). These remain their native
SIMULATED/ANALYZE_ONLY contracts. Their fixture grants never become PhiOS grants.

| Proposed use | Actual Phase II evidence | Remaining test required |
|---|---|---|
| Branch-local memory/ancestor state | VERIFIED finite pocket refs and recorded configuration lineage | PROPOSED independent branch merge/conflict policy |
| Bounded traversal/isolation | VERIFIED graph visits, paths, depth and cycle checks | PROPOSED actual relationship-aware routing and execution isolation |
| Evidence propagation/conflict containment | VERIFIED native references/holds stay distinct | PROPOSED routed evidence transactions across separate stores |
| Conservation across nested pockets | VERIFIED one activity's logical vector and immutable ceilings | PROPOSED native R8 resource transfer mapping; abstract steps are not CPU time |
| Linear/tree/DAG/mesh/Fibonacci/recursive comparison | Existing native experiments inspected | PROPOSED matched tasks, reachability, traversal/storage/redundancy/recovery/consistency cohorts |

No new topology tournament is run without a precise task/control. Golden-ratio
or Fibonacci geometry has no established computational advantage here. A graph's
shape, symbolic address and actor identity remain different concepts.

## Φ035/Φ036 — measurements, reservations and source overhead

The original nine resource dimensions remain intact. Extension activities use
14 separate dimensions by adding `nativeRecords`, `provenanceEdges`,
`checkpointRecords`, `witnessChecks`, and `graphVisits`. SQL statements, interpreter
fuel, fixture comparisons, bytes, counts and wall time are never converted into
one score. Category partitions keep source hashing/provenance verification,
storage, memory, planning and IPC communication attributable. Per-kind worker,
SQL, witness and graph ceilings are fixed; candidates cannot raise them.

For every unit: reserved = measured + uncertain + unused + open. A started
interruption retains its entire unresolved budget as uncertain rather than
claiming zero cost. A timeout is not successful cancellation. Replay validates
the category partition and rejects counter/budget tampering in all 14 dimensions.

The [final executed demonstration](demonstration.json) recorded:

| Logical measurement | Original six core operations | Four extension activities |
|---|---:|---:|
| Isolated worker calls | 6 | 1 |
| Fixture rows | 3,888 | 0 |
| Comparisons | 19,644 | 0 |
| Interpreter fuel / receipt checks | 66 / 66 | 0 / 0 |
| Counted SQL statements | 274 | 99 |
| Source bytes read/hashed | 261,033,640 | 174,083,680 |
| Worker IPC bytes | 101,714 | 14,668 |
| Serialized artifact bytes | 49,326 | 21,924 |
| Native records / provenance edges | 0 / 0 | 15 / 5 |
| Checkpoint records / witness proofs | 0 / 0 | 2 / 2 |
| Defined graph visits | 0 | 22 |

Final journal size is 123,290 bytes/31 records. Extension wall-time diagnostics
were 328,957 µs (checkpoint 1), 324,430 µs (native intake), 259,348 µs (genome),
and 283,147 µs (checkpoint 2). These individual local diagnostics include the
surrounding source scans, not matched isolated latency estimates. Completed
demo uncertain/open totals are zero; actual interruption tests preserve nonzero
uncertainty. Full reserved/unused vectors and category allocations are in the
receipt, rather than conflated with completed work.

**Accounting limits:** source scanning, IPC and artifact serialization inside
the bounded operation are counted, and the original replay adapter remains a
reserved core operation. Session initialization/preflight, repeated diagnostic
`inspect/load`/HMAC/semantic replay, reference-witness disk/crypto details,
standalone `protectedRead`, Python connection setup/teardown, kernel I/O,
network transport bytes and complete CPU/RAM/energy are not comprehensively
metered. Logical ceilings plus process deadlines are not physical OS quotas.
This increment does not claim complete runtime efficiency or billing accuracy.

### Safe inventory-cache comparison

The v2 optimization caches only the header-authenticated **tracked path list**.
Every covered byte is still re-read/hashed before and after an operation; HEAD,
tracked dirtiness, untracked importable files and this runtime's own tree are
still checked. No content digest or mtime cache is trusted. A same-size,
timestamp-preserving actual source edit and an injected untracked module both
refused. A pre-read size/count guard also bounds source allocation.

This preserves drift detection under the existing trusted-host model. It does
not make a mutable host into a sandbox, prevent a malicious transient swap
between checks, or authenticate Python wheels. Those limits existed before the
path-list optimization and remain material.

The frozen nine-pair alternating-order script compares full inventory discovery
against cached path discovery while asserting **identical manifest, file count
and covered byte count on every pair**. All samples are retained, including
adverse pairs and interim runs:

| Run | Bytes/files per scan | Full median [min–max], µs | Cached median [min–max], µs |
|---|---|---:|---:|
| Initial shared-load/interim code | 21,733,984 / 2,956 | 167,736 [143,249–219,009] | 132,476 [129,070–167,958] |
| Interim repeat | 21,733,984 / 2,956 | 139,091 [128,419–197,614] | 125,711 [115,785–159,615] |
| Final code, after serial tests | 21,734,860 / 2,956 | 142,427 [130,309–203,200] | 127,698 [121,479–180,236] |

The final local median reduction is about **10.34%**; pair 1 is slower with the
cache (180,236 versus 163,614 µs). Covered bytes are unchanged between modes.
Small cohorts, shared hardware/OS caching and interim code changes prevent a
general speed/energy claim or a causal comparison across runs. No complete
integrated efficiency advantage is demonstrated. Receipts: [initial](cache-benchmark-initial.json),
[interim](cache-benchmark-interim.json), [final all nine pairs](cache-benchmark.json).

## Φ042 — internal evaluation, negative findings and separation

The evaluation contract is explicitly internal and frozen before comparative
runs. No independently supplied evaluator, held-out real-world corpus or
independently administered keys were supplied. The native R0.5 benchmark was
executed twice with identical results, unchanged thresholds and all 36 queries:
12 historical wording, 12 current wording and 12 negative controls. It uses
24 active records and 12 ancestors. Its schema's word “heldout” does not turn
these pre-authored synthetic examples into independent evidence.

| Unchanged native method | Historical hit@1 | Current hit@1 | Negative false accepts | Abstentions across 36 queries |
|---|---:|---:|---:|---:|
| lexical | 0/12 | 12/12 | 0/12 | 24/36 |
| ancestry | 12/12 | 12/12 | 0/12 | 12/36 |
| sparse TF-IDF | 0/12 | 12/12 | 0/12 | 24/36 |
| sparse-history TF-IDF | 12/12 | 12/12 | **4/12** | 8/36 |

Historical/current positive hit@3 and MRR@3 equal their reported hit@1 rates in
this fixture. Sparse-history's negative acceptance rate is 33.3%, a concrete
FAILED zero-false-accept hypothesis. Ancestry methods see additional historical
text; thresholds differ by the native frozen contract. These are not matched
information/budget superiority tests, neural embedding baselines, factual truth
scores or statistically significant real-world findings. Every query index,
rank and abstention is retained in [native-benchmark.json](native-benchmark.json).
No threshold or favorable-seed selection was used to improve the result.

Φ030 predicts synthetic numeric environment classes; native retrieval ranks
text records with ancestry. Their accuracy numbers do not share a task/denominator
and are not subtracted or relabeled as a native improvement. The [previous
report's negative results](../engineering-report.md#comparative-measurements-and-negative-results)
remain authoritative: Φ017 pocket accuracy collapses to 46.64% under unexpected
shift (76/90 regressions), and stationary Φ030 context-tagged memory scores
73.15% versus recent memory's 80.15%. This adapter does not repair those failures.

| Evaluation question | Executed control/status | Next invalidating control |
|---|---|---|
| Supplied versus inferred/noisy context | VERIFIED supplied, changed, null/unknown and delayed-admission contracts only | PROPOSED frozen independently labeled sequence with noisy/inferred/delayed tags and label leakage checks |
| Native versus recent/age/context memory | VERIFIED original Φ030 histories preserved and native ranking benchmark reproduced | PROPOSED one shared task with explicit information access, abstention policy and matched total budgets |
| Recombination versus ordinary search | VERIFIED deterministic finite transformation/refusal/reconstruction contracts | PROPOSED mutation/random/exhaustive/graph baselines with equal evaluation, storage and search ceilings |
| Abrupt/recurrent/misleading environments | Prior SIMULATED failures preserved; native contradictory/missing/saturated/unseen-ref controls VERIFIED | PROPOSED multi-seed developmental streams with fixed train/evaluation separation |
| Independent evaluation | BLOCKED: no independent task custodian or external observations supplied | Freeze versioned evaluator/task package outside candidate control, then receive tasks without retuning |

Future developmental comparisons must report accuracy, coverage, abstention,
adaptation latency, per-unit resources, recovery, failure rate, worst-case seeds
and variability over **all** declared seeds. For this increment, adaptation
latency/accuracy across independent seeds is BLOCKED/not measured; deterministic
contract cases are not learning trials. No topology or recombination benefit is
asserted from green validation tests.

## Actual tests, failures and CI boundary

| Executed local check | Actual result | Receipt |
|---|---|---|
| Phase II Node suite | 28 reported tests passed, zero skipped; includes integration parent plus its 12 subtests | [node-tests.json](node-tests.json) |
| Native intake Python suite | 16 passed | [python-tests.json](python-tests.json) |
| Original Cycle III suite | 19 passed after final runtime changes | [regressions.json](regressions.json) |
| RC2 semantic checks | Seven passed | [regressions.json](regressions.json) |
| RC2 actual process kills | 12 cases and five additional storage checks passed | [regressions.json](regressions.json) |
| Legacy Python research suite, adapter-only venv | FAILED imports: NumPy is intentionally absent; 26 discovered tests/errors, not a claimed pass | [regressions.json](regressions.json) |
| Same unchanged legacy suite, research Python with root dependency | 38 passed | [regressions.json](regressions.json) |
| Actual PhiMemory9 native suite | 124 passed at the pinned revision | [native-suite.json](native-suite.json) |
| Final complete v2 demonstration | 31 records, two native checkpoints, native intake, NEST and fresh protected read; release BLOCKED | [demonstration.json](demonstration.json) |

The Phase II Node suite includes four actual new SIGKILL windows: native intake
before its result, session after witness commit, and witness publication/anchor
advancement. These establish process-crash behavior on this Linux host, not
power-loss durability. The common-administrator rollback limitation deliberately
passes a test that demonstrates the attack; it is not a successful protection
claim. The first v2 four-root integration failure and legacy environment failure
were investigated without deleting checks, loosening schemas or installing
extra packages into the isolated runtime closure.

The new [workflow](../../../.github/workflows/cycle3-phase2.yml) configures:

- Ubuntu full native/session/continuity/genome/source-cache tests, native memory
  suite, disposable demonstration and RC2 regression/crash checks.
- Hosted Windows read-only SQLite, checkpoint/crypto and pure graph contracts.
  This intentionally excludes full session durability until that implementation
  is separately qualified; no directory-fsync step in the session engine is
  silently weakened to claim Windows readiness.

Existing workflows and Φ017–Φ034 source/results remain unchanged. At source-report
commit time, these new hosted jobs are **IMPLEMENTED — UNVERIFIED** until they
actually run. The durable **publication receipt in the associated draft PR's
description** records its URL, exact published commit/tree, actual check-run
counts/conclusions and final draft/unmerged state after publication. That receipt
is the post-publication part of this report; the report's own source revision
is the Git commit containing it. A self-containing commit SHA cannot be embedded
in its own contents. Local results are never substituted for missing remote CI.

## Windows and physical workstation qualification

Hosted Windows tests can establish Windows path/SQLite/crypto/graph behavior
only for the executed jobs. Native Windows whole-session writer locks, directory
fsync, atomic publication/recovery under actual interruption, power loss and
offline package/OS installation remain BLOCKED. No Windows full-session claim is
made by testing only a portable subset.

The intended Core Ultra 9 285K, RTX 5070 12 GB, 32 GB/NVMe Windows 11 workstation
was not accessible for physical qualification. No GPU, VRAM, Ollama model,
inference-provider replacement, live permission grant, system install or machine
configuration was tested or changed. The implementation remains CPU-first, local
and provider-free. No claim about that hardware's performance follows.

## Updated Φ035–Φ043 milestone matrix

These are scoped capability classifications, not declarations that whole
milestones or Cycle III are complete.

| Milestone | Verified increment | Remaining classification |
|---|---|---|
| Φ035 modular runtime | VERIFIED explicit v1/v2 profiles in one session engine, original six adapters plus bounded activities | PROPOSED broader replaceable developmental runtime/historical migration |
| Φ036 accounting | VERIFIED reservation/start/result/uncertainty and 14-unit extension accounting, strict SQL ceiling, measured path-cache comparison | BLOCKED complete physical accounting/OS quotas/complete efficiency claim |
| Φ037 protected continuity | VERIFIED actual native signed-anchor interface, protected prefix, key-policy/refusal/interruption contracts | BLOCKED independent custody/authenticated production deployment; common-admin protection hypothesis FAILED |
| Φ038 governed experiential memory | VERIFIED actual read-only PhiMemory9 intake, exact provenance/holds/cold reconstruction; fixtures SIMULATED | PROPOSED real observation receipts/consolidation integration and comparable developmental memory task |
| Φ039 computational genome | VERIFIED finite descriptive schema, NEST/REVERSE/RECALL/COMPOSE, native syntax/address mapping, exact undo | PROPOSED dynamic/unsupported semantics, evolutionary evaluation and topology benefit |
| Φ040 collaboration | VERIFIED existing Agentora pending plan/handoff storage retained | BLOCKED live workers/inference/tools; model agreement is not independent evidence |
| Φ041 PhiOS enforcement | VERIFIED original native denial, empty authority and held execution retained | BLOCKED independently qualified live enforcement/recovery; no parallel authority plane |
| Φ042 independent crucible | VERIFIED frozen internal contract, native comparative negatives and engineering refusal controls | BLOCKED genuine independence/real held-out tasks; broader matched developmental cohorts PROPOSED |
| Φ043 research candidate | VERIFIED scoped Linux demonstration, exact pins, new guide/diagnostics/recovery and blocked release gate | IMPLEMENTED — UNVERIFIED new hosted Windows subset until CI; full workstation/research-release qualification BLOCKED |

## Reproduction and next engineering increments

Use the [local guide](local-guide.md) for explicit dependency checkout, v2 config,
isolated environment, native request formats, recovery and disposable demo.
Run source-mutation tests serially against disposable dependency checkouts.
Benchmark/demo scripts install nothing and never open a network listener.
Exact artifact reconstruction requires the same approved database bytes/request;
fresh fixture databases/keys/times deliberately produce new identities/digests.

Priorities for a subsequent authorized increment:

1. Qualify the existing PocketMesh authenticated-publisher/deployment path in a
   **separately administered** witness/policy/key store. Establish provisioning,
   rotation/revocation/recovery and unavailable/stale policies with an independent
   operator; do not provision it automatically from this research session.
2. Add a native public read-only evidence facade and independently attributable
   observation/admission receipts. Preserve unknowns, privacy, revocation and
   source conflicts; define how refreshed catalogs relate to existing genomes
   before supporting long-lived memory replacement.
3. Freeze one shared developmental task outside candidate control, with
   comparable memory/search baselines and all-seed failure/latency/resource
   reporting. Separately qualify full Windows durability and the actual local
   workstation before expanding inference or execution scope.

Human-controlled trust, permissions, evaluators, ceilings and approval remain
outside candidate transformations. Memory is not truth; provenance is not
permission; topology is not identity; recovered state is not recovered authority;
green CI is not release readiness.
