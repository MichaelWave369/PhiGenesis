"""Fixed local draft/review adapters. Never imports the Agentora team executor."""
from __future__ import annotations

import dataclasses
import importlib.metadata
import json
import os
import sqlite3
import sys
from pathlib import Path
from urllib.parse import quote


def main(request):
    stage = request["stage"]
    roots = request["roots"]
    # The explicit v2 profile adds native memory/mesh roots. The historical
    # Phi033 contract must still see exactly its original four-source interface.
    legacy_roots = {name: roots[name] for name in ("PhiGenesis", "Agentora", "Altermath", "PhiOS")}
    candidate = Path(__file__).resolve().parents[2]
    requirements = Path(__file__).with_name("requirements.txt").read_text()
    versions = {}
    for line in requirements.splitlines():
        if line and not line.startswith("#"):
            name, expected = line.split("==")
            versions[name] = importlib.metadata.version(name)
            if versions[name] != expected:
                raise ValueError("Python dependency drift: " + name)

    from sqlmodel import SQLModel, Session, create_engine
    from sqlalchemy import event
    # Load installed dependencies before adding audited repository import roots.
    sys.path[:0] = [str(candidate / "experiments"),
                    str(Path(roots["Agentora"]) / "server"), roots["PhiOS"]]
    from app.models import Agent, Team, Run
    from app.core.config import settings
    from phi032_agentora_bridge import stage as stage_draft, validate, digest
    from phi033_phios_bridge import review, verify_review, PATHS
    from phios.spine.gate import PermissionGate
    from phios.spine.models import Capability
    from phios.spine.effects import EffectBoundaryPolicy

    if stage == "preflight":
        return {"schema": "cycle3-preflight/v1", "authority": "NONE", "versions": versions,
                "python": sys.version.split()[0], "sqlite": sqlite3.sqlite_version}
    if stage not in ("plan", "review", "replay"):
        raise ValueError("unsupported adapter")
    value = request["input"]
    packet = value["packet"]
    validate(packet)
    db = Path(request["directory"]) / "draft.sqlite3"
    if stage == "plan":
        # Partial drafts remain quarantined after interruption. Never reuse them.
        fd = os.open(db, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(fd)
        engine = create_engine("sqlite:///" + str(db))
    else:
        if not db.is_file() or db.is_symlink():
            raise ValueError("research draft database missing")
        engine = create_engine("sqlite:///file:" + quote(str(db.resolve()), safe="/:") + "?mode=ro&uri=true")
    measured = {k: 0 for k in ("workerCalls", "fixtureRows", "comparisons", "interpreterFuel",
                               "receiptChecks", "sqlStatements", "sourceBytes", "ipcBytes", "artifactBytes")}
    measured["workerCalls"] = 1

    @event.listens_for(engine, "before_cursor_execute")
    def count_statement(*_args):
        measured["sqlStatements"] += 1

    try:
        if stage == "plan":
            settings.agentora_enable_team_debate = True
            settings.agentora_enable_single_agent_fallback = True
            settings.agentora_max_team_turns = 3
            settings.agentora_max_tool_steps = 1
            SQLModel.metadata.create_all(engine)
            with Session(engine) as session:
                agents = [Agent(name=role, model="not-invoked", role=role,
                                system_prompt="Offline research draft only",
                                tools_json="[]", memory_mode="none")
                          for role in ("planner", "executor", "critic", "synthesizer")]
                session.add_all(agents)
                session.commit()
                team = Team(name="Cycle III isolated research")
                session.add(team)
                session.commit()
                run = Run(team_id=team.id, status="pending")
                session.add(run)
                session.commit()
                draft = stage_draft(session, packet, agents, run.id)
                artifact = dict(schema="cycle3-plan/v1", authority="NONE", packet=packet,
                                draft=draft, runId=run.id)
        elif stage == "review":
            measured["sourceBytes"] += sum((Path(roots[repo]) / path).stat().st_size
                                            for repo, paths in PATHS.items() for path in paths)
            with Session(engine) as session:
                result = review(session, value["runId"], packet, value["draft"], legacy_roots)
                artifact = dict(schema="cycle3-review/v1", authority="NONE", packet=packet,
                                draft=value["draft"], runId=value["runId"], review=result)
        else:
            measured["sourceBytes"] += sum((Path(roots[repo]) / path).stat().st_size
                                            for repo, paths in PATHS.items() for path in paths)
            with Session(engine) as session:
                if not verify_review(session, value["runId"], packet, value["draft"], legacy_roots, value["review"]):
                    raise ValueError("review replay")
            # Native PhiOS enforcement decision, with an empty permission ceiling.
            # No Spine instance or executor is created or invoked.
            capability = Capability(id="genesis.research.live", name="Genesis live execution",
                                    description="Denied research request", permissions=("genesis.live.execute",),
                                    effects=("process.spawn",), risk="high")
            decision = PermissionGate(()).evaluate(capability)
            effects = EffectBoundaryPolicy().evaluate(capability, executor_effects=capability.effects)
            if decision.allowed or decision.granted or not effects.allowed:
                raise ValueError("native permission/effect gate drift")
            artifact = dict(schema="cycle3-replay/v1", authority="NONE", packetDigest=packet["digest"],
                            reviewHash=digest(value["review"]), verified=True,
                            permission={k: v for k, v in dataclasses.asdict(decision).items() if k != "reason"},
                            effects=dataclasses.asdict(effects))
    finally:
        engine.dispose()
    return {"artifact": artifact, "measured": measured}


if __name__ == "__main__":
    raw = sys.stdin.buffer.read(750001)
    if len(raw) > 750000:
        raise ValueError("input bound")
    print(json.dumps(main(json.loads(raw)), sort_keys=True, separators=(",", ":"), allow_nan=False))
