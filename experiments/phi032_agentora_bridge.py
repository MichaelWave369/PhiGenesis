"""Offline evidence-to-Agentora planning adapter. No model, tool or worker execution."""
import hashlib
import json
import re

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False).encode()).hexdigest()

def integer(value, lo, hi):
    return type(value) is int and lo <= value <= hi

def validate(packet):
    if type(packet) is not dict or set(packet) != {"body", "digest"}:
        raise ValueError("packet")
    b = packet["body"]
    if type(b) is not dict or set(b) != {"schema","authority","epoch","query","votes","prediction","nearest","events","fuel","receiptHeads","reportHash"}:
        raise ValueError("body")
    if b["schema"] != "phi032-advisory-v1" or b["authority"] != "NONE" or not integer(b["epoch"],0,23):
        raise ValueError("scope")
    q=b["query"]
    if type(q) is not dict or set(q) != {"context","x","y","tag"} or not all(integer(q[k],0,n) for k,n in (("context",2),("x",8),("y",8),("tag",1))):
        raise ValueError("query")
    votes=b["votes"]
    if type(votes) is not list or len(votes)!=3 or not all(integer(x,0,72) for x in votes) or not integer(b["nearest"],0,72) or sum(votes)!=b["nearest"]:
        raise ValueError("votes")
    maximum=max(votes)
    expected=votes.index(maximum) if maximum>0 and votes.count(maximum)==1 else None
    if (b["prediction"] is not None and not integer(b["prediction"],0,2)) or b["prediction"]!=expected or not integer(b["events"],33,33) or not integer(b["fuel"],33,33):
        raise ValueError("result")
    heads=b["receiptHeads"]
    if type(heads) is not list or len(heads)!=3 or not all(type(x) is str and re.fullmatch(r"[0-9a-f]{64}",x) for x in heads+[b["reportHash"],packet["digest"]]):
        raise ValueError("hash")
    if digest(b)!=packet["digest"]:
        raise ValueError("digest")
    return b

def stage(session, packet, agents, run_id):
    from app.services.runtime.team import create_team_plan, list_plan, create_handoff
    b=validate(packet)
    roles=["planner","executor","critic","synthesizer"]
    if len(agents)!=4 or [a.role for a in agents]!=roles or any(a.tools_json!="[]" or a.memory_mode!="none" or not a.id for a in agents):
        raise ValueError("isolated roles required")
    # Only fixed text and validated bounded scalars, never arbitrary packet instructions.
    prompt=("Plan and verify synthetic memory evidence; compare vote totals and critique uncertainty; "
            "design a review checklist and synthesize an advisory answer. "
            f"Evidence {packet['digest']}; epoch {b['epoch']}; votes {b['votes']}; prediction {b['prediction']}. "
            "Do not call tools, models, memory or workers. No execution or approval.")
    plan=create_team_plan(session,run_id,prompt,agents,requested_mode="careful")
    listing=list_plan(session,run_id)
    subgoals=listing["subgoals"]
    if not listing["ok"] or len(subgoals)!=4 or [s.assigned_agent_role for s in subgoals]!=roles:
        raise ValueError("unexpected Agentora plan")
    # Agentora stores positional dependency hints, not validated persistent IDs.
    for i,s in enumerate(subgoals):
        if json.loads(s.dependency_subgoal_ids_json)!=([i-1] if i else []) or s.status!="pending":
            raise ValueError("unexpected subgoal")
    handoffs=[]
    for left,right in zip(agents,agents[1:]):
        handoffs.append(create_handoff(session,run_id,left.id,right.id,
            "Offline evidence review draft",f"Evidence digest {packet['digest']}",
            "Advisory review only",False,False,1))
    return {"authority":"NONE","packetDigest":packet["digest"],"planId":plan.id,
            "roles":roles,"subgoalIds":[s.id for s in subgoals],
            "handoffIds":[h.id for h in handoffs],
            "workerHints":sum(bool(s.needs_worker) for s in subgoals),
            "executionPerformed":False}
