# Cycle III foundation v0.1

An explicitly invoked, CPU-only local research session over the existing Φ030
memory, Φ031 Altermath, Φ032 Agentora draft, and Φ033 PhiOS review adapters.
No model, Ollama service, GPU, network provider, tool execution, worker dispatch,
production database, or permission grant is used. The nine-milestone Cycle III
roadmap is **not complete**. See the [engineering report](../../docs/cycle3/engineering-report.md).

## Verified environment and dependencies

Verified locally: Linux x86-64, Node 24.22.3, Python 3.12.14, and the complete
Python version set in `requirements.txt`, installed in a fresh isolated venv.
CI exercises Node 22/Python 3.11. Its actual status belongs to the published
commit's checks. Native Windows 11, Windows filesystem durability, power loss,
and the user's Core Ultra/RTX 5070 hardware are **BLOCKED** pending qualification.
The following is the Linux procedure; it can be used inside an already available
compatible WSL environment. Nothing installs WSL or changes system configuration.

Git must be available for read-only source checks. Setup needs explicit package
and repository acquisition; execution and the dependency-free protocol tests are
offline. Runtime code never downloads packages or models.

```sh
python -m venv .venv-cycle3
.venv-cycle3/bin/python -m pip install -r runtime/cycle3/requirements.txt
mkdir -p dependencies research-sessions

git clone https://github.com/MichaelWave369/PhiGenesis.git dependencies/genesis
git -C dependencies/genesis checkout --detach 22114dc95ee56b49cd23a5eeff1b8a0a3d1d972e
git clone https://github.com/MichaelWave369/Agentora.git dependencies/agentora
git -C dependencies/agentora checkout --detach 49166bb5365975d68df744678f91a837b0da48f2
git clone https://github.com/MichaelWave369/Altermath.git dependencies/altermath
git -C dependencies/altermath checkout --detach 99a40f6f8e6f4ded656dd3655778dfffa72a3754
git clone https://github.com/MichaelWave369/PhiOS.git dependencies/phios
git -C dependencies/phios checkout --detach da87f8fe7d26036a61a97aca6eebc2afc2a747c3
```

Create a local config from the actual paths (or edit `config.example.json`):

```sh
.venv-cycle3/bin/python - <<'PY'
import json
from pathlib import Path
b = Path.cwd()
c = dict(schema="PhiGenesis.CycleIII.v1", authority="NONE",
         python=str(b/".venv-cycle3/bin/python"),
         roots={name: str(b/"dependencies"/folder) for name, folder in
                (("PhiGenesis", "genesis"), ("Agentora", "agentora"),
                 ("Altermath", "altermath"), ("PhiOS", "phios"))})
(b/"research-sessions/config.json").write_text(json.dumps(c, indent=2))
PY
```

The **dependency** PhiGenesis checkout is deliberately pinned separately from
this candidate. It supplies the historical source manifest expected by Φ033.
Do not substitute today's default branch or change the declared pins to make a
drift check pass. Checkouts must have clean tracked files and no unexpected
untracked importable source files. Runtime reads/hashes them; it never edits them.

## Deterministic demonstration

Supply a 32-byte key from your trusted local key handling. For a disposable test
only, this generates a session key without printing or writing it:

```sh
export PHIGENESIS_CHECKPOINT_KEY="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
node runtime/cycle3/cli.mjs init research-sessions/demo-001 research-sessions/config.json
for phase in 1 2 3 4 5 6; do
  node runtime/cycle3/cli.mjs next research-sessions/demo-001 || break
done
node runtime/cycle3/cli.mjs inspect research-sessions/demo-001
node runtime/cycle3/cli.mjs artifact research-sessions/demo-001 replay
node runtime/cycle3/cli.mjs gate
```

The gate intentionally exits **1**, with `release: BLOCKED`. A completed demo
reports `COMPLETED_RESEARCH_ONLY`, six completed operations, empty grants, a
native PhiOS permission denial, and 19 authenticated records. Two fresh sessions
produce the same six artifact hashes. Session IDs, keys, HMAC heads, elapsed time,
source hash when the runtime/Node version changes, and path-dependent IPC bytes
are not expected to be identical.

The six operations are:

| Operation | Existing implementation | Result |
|---|---|---|
| `memory` | Φ030 `run(7, 'delayed', 'context-tagged', 24)` | Bounded synthetic snapshot; delayed evidence retained |
| `retrieve` | Φ031 `retrieve` and actual Altermath Causal Belt R1 | Vote report and typed Φ032 packet |
| `verify` | Φ031 `verifyReport` and Φ032 packetization | Replayed evidence; its compute is charged |
| `plan` | Actual Agentora `create_team_plan`/`create_handoff` via Φ032 | Persistent, pending draft in a new research SQLite DB |
| `review` | Actual Φ033 Covenant/AuthorityProjection records | Empty ceiling and HELD execution transition |
| `replay` | Fresh-process Φ033 `verify_review`, PhiOS PermissionGate/EffectBoundaryPolicy | Rechecked database and explicit native denial |

`production: [4,4,4]` is the historical protocol's fixed sentinel, not a read of
an installed production system. No completed result changes production state.
The snapshot is finite synthetic memory, not the native PhiMemory9 engine.

## Accounting and provenance

Every operation has an fsynced reservation and then an fsynced start before source
validation or adapter invocation. Completion binds the exact input, artifact,
separate resource vector, diagnostic timing, and category allocation. Nine
categories are observation, memory, planning, interpreter, orchestration,
evaluation, verification, storage, and communication. Planning/discovery is zero
in this fixed workflow: Agentora creates drafts, while Φ025 discovery is deferred.

Nine units are **not interchangeable**: worker invocations, generated fixture
rows, distance evaluations, Altermath fuel, receipt checks, SQL statements,
source bytes explicitly hashed, serialized IPC bytes, and artifact bytes.
Per unit: `reserved = measured + uncertain + unused + open`. Categories partition
measured work; unused and uncertain reservations remain attached to their
operation. The same uncertainty budget is not duplicated across categories.

Source checks hash every tracked file in the four pinned dependency checkouts and
all candidate runtime/experiment files, reject tracked/untracked source drift,
and bind the Node version. Python package versions are checked in each Python
worker. This does not authenticate package bytes, the interpreter/OS, or external
observation truth. Local package/OS/key custody remains trusted.

Observed elapsed microseconds, journal size and draft database size are reported
separately. They are not resource currencies. Logical budgets do not enforce CPU,
RAM, physical I/O, energy, or all subprocess costs. A 15-second subprocess timeout
and bounded output limit are host guards, not real-time/OS isolation guarantees.
Source hashing overhead is substantial; no efficiency advantage is claimed.

HMAC-SHA256 reuses RC2 storage. The new research schema cannot be opened as an
RC2 or Φ028/029 authority record. An optional trusted `PHIGENESIS_EXPECTED_MAC`
rejects a different current head. Store/update that pin independently if it is
used: an old pin deliberately refuses later heads as well. Without a protected
external pin, valid-prefix rollback remains possible. No independent witness,
Ed25519 role custody, rotation, revocation, confidentiality, or BFT is added.

## Recovery and reversal

Inspection authenticates/reconstructs records but never calls an adapter, writes
the SQLite database, or restores authority. A pending unstarted reservation is
open; started unresolved work is uncertain. Neither is silently restarted.

```sh
node runtime/cycle3/cli.mjs inspect research-sessions/demo-001
# Only if a process was killed while holding the writer lock:
node runtime/cycle3/cli.mjs unlock research-sessions/demo-001 EXACT_LOCK_SHA256_FROM_INSPECT
node runtime/cycle3/cli.mjs abandon research-sessions/demo-001 "operator discarded interrupted research attempt"
```

`unlock` requires the inspected lock digest and refuses a PID that still exists.
It assumes local, cooperative processes; it is not a distributed lock. Abandon is
idempotent and terminal for the session. Start a **new** session to repeat work.
Completed but unrecorded draft databases remain quarantined, never imported as
completed results. Partial journal tails fail closed; this CLI never truncates
them or automatically repairs evidence. Preserve the original before manual
forensic recovery. No power-loss or malicious-filesystem guarantee is made.

The implementation and dependency files remain read-only during operation.
Removing an isolated disposable session reverses its local research state;
preserve evidence first if needed. Do not point this adapter at a live database.

## Tests and release boundary

```sh
# No Python packages, model, network, or external repository needed:
node --test tests/cycle3/protocol.test.mjs
# Full offline tests after the explicit setup above:
PHIGENESIS_CYCLE3_CONFIG="$PWD/research-sessions/config.json" node --test tests/cycle3/*.test.mjs
node runtime/cli-v10-rc2.mjs test
node runtime/test-crash-v10-rc2.mjs
```

The integration test mutates and restores one source file in the disposable
Altermath checkout to exercise drift refusal. Use dedicated test checkouts. It
also creates temporary SQLite records, kills three actual child processes, tests
two cold inspections, duplicate admission, native permission drift, and the
blocked gate. It does not dispatch research agents or run an inference provider.

Research acceptance concerns these narrow software contracts only. Independent
scientific evaluation, independently administered witnesses, genuine runtime
enforcement and explicit human production approval remain mandatory open gates.
