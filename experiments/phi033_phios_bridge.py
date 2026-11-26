"""Φ033 offline Covenant intake. No execution, grants, or live state writes."""
from pathlib import Path
import hashlib
import re

from phi032_agentora_bridge import validate, digest
from phios.covenant import (
    BoundaryContext, BoundaryTransitionRequest, BoundaryTransitionReceipt,
    IdentitySeal, IdentitySubjectKind, TransitionStatus, TrustZone, transition_receipt,
)
from phios.mandala import AuthorityProjection

# This manifest describes only the enumerated source artifacts, not an installed runtime.
PINS = {
    "PhiGenesis": "22114dc95ee56b49cd23a5eeff1b8a0a3d1d972e",
    "Agentora": "49166bb5365975d68df744678f91a837b0da48f2",
    "Altermath": "99a40f6f8e6f4ded656dd3655778dfffa72a3754",
    "PhiOS": "da87f8fe7d26036a61a97aca6eebc2afc2a747c3",
}
PATHS = {
    "PhiGenesis": ("experiments/phi030-memory.mjs", "experiments/phi031-altermath-bridge.mjs",
                   "experiments/phi032-packet.mjs", "experiments/phi032-export.mjs",
                   "experiments/phi032_agentora_bridge.py"),
    "Agentora": ("server/app/services/runtime/team.py", "server/app/models.py"),
    "Altermath": ("src/causal-belt.mjs",),
    "PhiOS": ("phios/covenant/identity.py", "phios/covenant/models.py",
              "phios/covenant/receipts.py", "phios/covenant/zones.py",
              "phios/mandala/authority_projection.py", "phios/mandala/contracts.py"),
}

def manifest(roots):
    if set(roots) != set(PATHS):
        raise ValueError("source roots")
    return {"schema":"phi033-source-manifest-v1","pins":dict(PINS),
            "files":{repo:{path:hashlib.sha256((Path(roots[repo])/path).read_bytes()).hexdigest()
                           for path in paths} for repo,paths in PATHS.items()}}

def validate_manifest(value):
    if type(value) is not dict or set(value)!={"schema","pins","files"} or value["schema"]!="phi033-source-manifest-v1" or value["pins"]!=PINS:
        raise ValueError("manifest")
    files=value["files"]
    if type(files) is not dict or set(files)!=set(PATHS):
        raise ValueError("manifest repositories")
    for repo,paths in PATHS.items():
        if type(files[repo]) is not dict or set(files[repo])!=set(paths):
            raise ValueError("manifest paths")
        if any(type(h) is not str or not re.fullmatch(r"[0-9a-f]{64}",h) for h in files[repo].values()):
            raise ValueError("manifest hash")
    return value

def inspect_draft(session, run_id, packet, staged):
    from app.models import Agent, AgentHandoff, Run
    from app.services.runtime.team import list_plan
    validate(packet)
    if type(staged) is not dict or set(staged)!={"authority","packetDigest","planId","roles","subgoalIds","handoffIds","workerHints","executionPerformed"}:
        raise ValueError("draft shape")
    roles=["planner","executor","critic","synthesizer"]
    if staged["authority"]!="NONE" or staged["executionPerformed"] is not False or staged["packetDigest"]!=packet["digest"] or staged["roles"]!=roles:
        raise ValueError("draft binding")
    run=session.get(Run,run_id)
    listing=list_plan(session,run_id)
    if not run or run.status!="pending" or not listing.get("ok"):
        raise ValueError("run status")
    plan,subgoals=listing["plan"],listing["subgoals"]
    if plan.id!=staged["planId"] or packet["digest"] not in plan.goal or len(subgoals)!=4 or [s.id for s in subgoals]!=staged["subgoalIds"]:
        raise ValueError("plan binding")
    if [s.assigned_agent_role for s in subgoals]!=roles or any(s.status!="pending" for s in subgoals):
        raise ValueError("subgoal status")
    agents=[session.get(Agent,s.assigned_agent_id) for s in subgoals]
    if any(a is None or a.tools_json!="[]" or a.memory_mode!="none" for a in agents):
        raise ValueError("agent scope")
    handoff_ids=staged["handoffIds"]
    if type(handoff_ids) is not list or len(handoff_ids)!=3 or len(set(handoff_ids))!=3:
        raise ValueError("handoff ids")
    handoffs=[session.get(AgentHandoff,i) for i in handoff_ids]
    for i,h in enumerate(handoffs):
        if h is None or h.run_id!=run_id or h.status!="open" or h.allow_tools or h.allow_memory or h.max_steps!=1 or packet["digest"] not in h.context_json or h.from_agent_id!=agents[i].id or h.to_agent_id!=agents[i+1].id:
            raise ValueError("handoff scope")
    return {"schema":"phi033-draft-observation-v1","packetDigest":packet["digest"],
            "runId":run_id,"planId":plan.id,"subgoalIds":[s.id for s in subgoals],
            "handoffIds":handoff_ids[:],"roles":roles,"pending":True,
            "workerHints":sum(bool(s.needs_worker) for s in subgoals),
            "actionAuthority":False,"executionAuthority":False}

def review(session, run_id, packet, staged, roots):
    evidence=validate(packet)
    sources=validate_manifest(manifest(roots))
    observed=inspect_draft(session,run_id,packet,staged)
    # Digest-bound provenance, explicitly not trusted identity.
    seal=IdentitySeal(
        subject_id="phi033-research-"+packet["digest"],
        subject_kind=IdentitySubjectKind.WORKFLOW,
        implementation_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        manifest_sha256=digest(sources),source_sha256=digest(sources["files"]),
        issuer_id="phi033-local-research",issuer_key_id="unsigned-provenance",
    )
    projection=AuthorityProjection.project(ceiling=(),events=(),observed_at="2026-01-01T00:00:00+00:00")
    authority=projection.to_authority_context()
    if authority.ceiling or authority.grants:
        raise ValueError("nonzero authority")
    context=BoundaryContext(zone=TrustZone.EXTERNAL,identity_seal_sha256=seal.sha256())
    contexts=[context.to_dict()]
    requests=[];receipts=[]
    for target,refs,reason in [
        (TrustZone.INTAKE,(packet["digest"],),"packet schema and digest checked"),
        (TrustZone.IDENTIFIED,(seal.sha256(),digest(sources)),"untrusted identity provenance bound"),
        (TrustZone.BOUNDED,(digest(observed),projection.projection_sha256),"draft observation and empty authority ceiling bound"),
        (TrustZone.GOVERNED_EXECUTION,(projection.projection_sha256,),"no execution grant; research boundary held"),
    ]:
        req=BoundaryTransitionRequest(source_zone=context.zone,target_zone=target,
            subject_seal_sha256=seal.sha256(),evidence_refs=tuple(sorted(set(refs))))
        held=target is TrustZone.GOVERNED_EXECUTION
        receipt=transition_receipt(req,status=TransitionStatus.HELD if held else TransitionStatus.ACCEPTED,
            requirements_satisfied=not held,reason=reason)
        requests.append(req.to_dict());receipts.append(receipt.to_dict())
        if not held:
            context=BoundaryContext(zone=target,identity_seal_sha256=seal.sha256(),
                previous_transition_receipt_sha256=receipt.sha256())
            contexts.append(context.to_dict())
    return {"schema":"phi033-review-v1","authority":"NONE","status":"HELD","zone":context.zone.value,
            "packetDigest":packet["digest"],"manifest":sources,"draft":observed,
            "seal":seal.to_dict(),"projection":projection.to_dict(),"contexts":contexts,
            "requests":requests,"receipts":receipts}

def verify_review(session,run_id,packet,staged,roots,report):
    if type(report) is not dict:
        raise ValueError("report")
    # Use real strict reconstruction before checking all evidence by replay.
    IdentitySeal.from_dict(report["seal"])
    for c in report["contexts"]: BoundaryContext.from_dict(c)
    for r in report["requests"]: BoundaryTransitionRequest.from_dict(r)
    for r in report["receipts"]: BoundaryTransitionReceipt.from_dict(r)
    if review(session,run_id,packet,staged,roots)!=report:
        raise ValueError("review replay mismatch")
    return True
