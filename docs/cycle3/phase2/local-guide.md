# Phase II local research guide

This increment adds explicit `PhiGenesis.CycleIII.v2` sessions in the existing
engine. It preserves v1 session bytes, six core adapters, historical experiments
and their tests. No provider, production witness, live executor or remote service
is enabled. The reference witness never opens a socket.

## Setup and explicit profile selection

Start with the [v1 dependency instructions](../../../runtime/cycle3/README.md).
Keep those four historical pins; add these two source checkouts explicitly:

```sh
git clone https://github.com/MichaelWave369/PhiMemory9.git dependencies/memory
git -C dependencies/memory checkout --detach 5cba675a3a439023a3ff374c238dd6e4339e3a55
git clone https://github.com/MichaelWave369/NBGPocketMesh.git dependencies/mesh
git -C dependencies/mesh checkout --detach 0687f10970989194d4af554d9b189c7ce8a1ad15
```

The existing locked Python venv is sufficient. Native memory needs only Python's
standard library; no additional packages/models are installed at runtime.

Create a new local config, using your actual absolute paths:

```json
{
  "schema": "PhiGenesis.CycleIII.v2",
  "authority": "NONE",
  "python": "/absolute/path/to/venv/bin/python",
  "roots": {
    "PhiGenesis": "/absolute/path/to/dependencies/genesis",
    "Agentora": "/absolute/path/to/dependencies/agentora",
    "Altermath": "/absolute/path/to/dependencies/altermath",
    "PhiOS": "/absolute/path/to/dependencies/phios",
    "PhiMemory9": "/absolute/path/to/dependencies/memory",
    "NBGPocketMesh": "/absolute/path/to/dependencies/mesh"
  }
}
```

`PhiGenesis` in `roots` remains the separate **historical manifest dependency**,
not this candidate's checkout. The runtime separately inventories its own source.
A v1 config still requires exactly the original four roots. Existing source/ABI
validation is not relaxed to accept mismatched checkouts.

## Disposable demonstration

From the PhiGenesis checkout:

```sh
node scripts/phase2-local-demo.mjs /absolute/path/to/NEW_demo_directory /absolute/path/to/v2-config.json
```

The command creates a new isolated session, executes the six original operations,
builds a disposable database through the actual PhiMemory9 API, publishes two
checkpoints to the same-host reference witness, and proposes one finite NEST
transformation. It writes a compact `evidence.json` into that new directory.
It refuses an existing session directory. Nothing reads an existing user memory
database by default, changes system configuration, downloads models or contacts
an inference provider.

Keys are generated for this disposable demonstration and remain in memory. For
later CLI inspection, supply your own disposable session key through the existing
`PHIGENESIS_CHECKPOINT_KEY` environment variable before running the demo. The
reference witness's ephemeral signing key is intentionally not persisted by this
script; persistent independent witness custody needs separate operator provisioning.
No real private keys appear in evidence receipts or source control.

The expected structure is 31 journal records: the 19-record core plus four
three-record activities. There are seven native fixture memories, two eligible
and five held, with explicit conflicts, supersession, missing source and context
holds. UUIDs/timestamps and key material are newly created per fixture. Reproduction
means the same procedure/contracts; **exact artifact reconstruction is relative to
the same approved database bytes and request**, not equal hashes for new databases.

The second checkpoint protects the first 28 records. Its own reservation/start/
result bookkeeping remains a three-record **unprotected tail**. A later explicit
checkpoint can protect a later prefix; do not call the entire current suffix
externally protected. A valid extension above the protected floor is allowed.
Rollback below that floor, or a stale local checkpoint against a newer witness
floor, is refused.

## Native read-only intake from an approved research database

Use a dedicated offline snapshot whose contents you are authorized to inspect.
The existing native `SnapshotReader` supplies a read-only/query-only connection;
the adapter binds native read methods to it without running constructors that
create schema. Reads occur in one transaction. Active WAL/rollback sidecars,
an unexpected database digest, partial evidence schema, integrity failure,
or capacity overflow are refused. No source DDL, update, repair or compaction runs.

Initialize a new v2 session and finish its six core operations first. Then invoke:

```sh
node runtime/cycle3/cli.mjs native /absolute/session /absolute/native-request.json
node runtime/cycle3/cli.mjs artifact /absolute/session native-memory
```

The request must contain exactly these fields:

```json
{
  "databasePath": "/absolute/path/to/approved-research.sqlite3",
  "databaseSha256": "OPERATOR_REVIEWED_SHA256_OF_THE_OFFLINE_DATABASE",
  "query": "pressure calibration",
  "context": null,
  "asOf": "2026-11-26T18:00:00+00:00",
  "maxAgeSeconds": 86400,
  "limit": 9,
  "observations": []
}
```

Replace the digest and time with reviewed values. A null context means unscoped
retrieval; it is not automatically inferred context. With no observation
declarations, records retain unknown observation times/source availability and
stay held. An optional entry in `observations` has exactly:

```json
{
  "memoryId": "ACTUAL_NATIVE_MEMORY_ID",
  "observedAt": "2026-11-26T12:00:00+00:00",
  "admitAfter": null,
  "expiresAt": null,
  "classification": "observed",
  "sourceState": "available"
}
```

Classification choices are observed, derived, hypothesis or missing. Source-state
choices are available, unavailable, revoked or unknown. These are explicitly
**operator declarations**, not authenticated real-world observations or native
permission/revocation enforcement. Creation time is native admission time; an
unavailable observation time remains null. Delayed, future, stale, expired,
missing, contradictory, retired/superseded and context-mismatched records retain
their own identities and explicit holds. Retrieval never turns them into facts.

Metadata includes native IDs, event revision references, ancestry, source IDs,
registered source pointers, claims/links/conflict identities, lifecycle,
timing declarations and content/record hashes. Memory text and claim statements
are not exported. Metadata, source locators and hashes can still be sensitive;
authorization to read a DB does not authorize publishing its evidence. The committed
receipts use invented fixtures only.

Limits: 8 MiB DB, 72 memories/blobs, 900 memory events, bounded evidence tables,
and at most 3,000 forwarded read statements per intake. The SQL guard rejects
the next statement **before** execution. Native connection setup remains fixed
overhead outside that statement counter; full physical resource accounting is open.
No truncation is presented as complete provenance. Unknown authority-bearing
request fields and unknown memory columns are refused; authority-looking text
inside a memory remains inert text.

## Checkpoints and current external trust

The typed APIs in `session.mjs` are `reserveActivity`, `startActivity`,
`performActivity`, `checkpointView` and `protectedRead`. A checkpoint activity
request contains `{policy, previous}`. The operator supplies the current public
trust policy and a transport object with `commit(checkpoint, heads, {signal})`
and `attest(nonce, {signal})`. No endpoint/key/permission is imported from a genome
or memory. The shipped `referenceWitness` implements this contract locally by
calling PocketMesh's actual R11 handler directly; it does not start its server.

Both witness operations have a bounded deadline (15 seconds per call by default).
Timeout requests abort but cannot prove remote cancellation: completion and
expenditure remain uncertain. No cached proof is substituted for an unavailable
witness. Read/proof checks require a freshly generated nonce and the current
externally supplied policy; recovered journal state does not supply trust.

The trust policy names one witness, an epoch/current key ID and active/revoked
Ed25519 public keys. Rotation is an explicit operator policy update, a new key
and a higher policy epoch, followed by a new checkpoint. Revoked or substituted
keys cannot verify current continuity. Historical HMAC replay still describes
what was recorded then; it does not make old authority or a revoked key current.

The local witness stores immutable checkpoint bodies alongside the existing
PocketMesh monotonic digest anchor. Duplicate submission is idempotent. If a
process dies after checkpoint publication but before anchor advancement, exact
explicit resubmission completes that same checkpoint; it does not invent a new one.
A process killed after the witness commits but before the session records its
result leaves uncertain work. A current witness proof can qualify the protected
prefix without authorizing work or automatically retrying the operation.

This reference assumes a trusted publisher and protected current trust policy.
It does not implement R13 client authentication, independent administration,
hardware counters, BFT or production key custody. Coordinated rollback by the
common local administrator remains demonstrably possible. Separate directories
and generated keys do not remove that limitation.

## Genome and recovery boundaries

Genomes are finite, non-executable metadata. The runtime derives actor identity
from the research session and binds implementation/control digests. It fixes
ceilings (36 pockets, 72 relations, depth six, nine memory refs per pocket), checks
native record digests, and preserves original configurations/lineage. The current
runtime starts from a three-pocket seed and supports NEST, REVERSE, known-ancestor
RECALL and same-pocket COMPOSE proposals. A reconstruction receipt restores the
exact parent, including its prior lineage data.

Native qualification compiles a fixed count-observation shape through Altermath
and derives ordinal addresses through Mycelium R2. It does not execute a genome,
route a mesh or establish a topology advantage. ROTATE, genome FOLD/UNFOLD,
dynamic CREATE/RELATE and other unsupported operations are refused. Actor identity,
ceilings, evaluator/policy/approval fields and witness configuration cannot be
changed by transformations. No live permission or production promotion exists.

The existing inspect/unlock/abandon commands also handle v2 activity interruption.
Inspection is read-only; native reads are not repeated. A stale writer lock needs
the inspected digest and a dead PID. Explicit abandonment is terminal. Preserve
the journal and source snapshot for review; start a new session to repeat work.

## Reproduction and platform scope

```sh
PHIGENESIS_PHASE2_NATIVE_ROOT=/absolute/PhiMemory9 python -m unittest discover -s tests/cycle3_phase2 -p test_native_memory.py -v
PHIGENESIS_PHASE2_MESH_ROOT=/absolute/NBGPocketMesh PHIGENESIS_PHASE2_CONFIG=/absolute/v2-config.json node --test --test-concurrency=1 tests/cycle3_phase2/*.test.mjs
node scripts/phase2-source-benchmark.mjs /absolute/v2-config.json
```

Run mutation/drift suites serially against disposable dependency checkouts.
The source cache stores only authenticated tracked path names: every covered
byte is still hashed before and after work, and revisions/dirty/untracked source
checks remain. No content/mtime cache is trusted. Before/after hashing detects
drift under the existing trusted-host model; it does not stop a hostile host
from transiently replacing code between checks.

Linux exercises full v1/v2 sessions and actual SIGKILL boundaries. The new hosted
Windows CI job targets read-only SQLite, cryptographic checkpoint and finite graph
contracts only. Native Windows full-session journal locking/directory fsync,
power loss, the physical Core Ultra/RTX workstation and Ollama/GPU execution
remain separate unqualified gates. No unsupported durability step is silently
skipped in the session engine to claim Windows readiness.
