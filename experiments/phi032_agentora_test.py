import copy
import json
import sys
import tempfile
from pathlib import Path
from sqlmodel import SQLModel, Session, create_engine
from app.models import Agent, Team, Run, AgentHandoff, TeamSubgoal
from app.core.config import settings
from app.services.runtime.team import list_plan, collaboration_trace
from phi032_agentora_bridge import validate, stage, digest

def refuse(packet):
    try: validate(packet)
    except ValueError: return
    raise AssertionError("accepted invalid packet")

def main(path):
    packets=json.loads(Path(path).read_text())
    assert len(packets)==12
    settings.agentora_enable_team_debate=True
    settings.agentora_enable_single_agent_fallback=True
    settings.agentora_max_team_turns=3
    settings.agentora_max_tool_steps=1
    checks=0
    with tempfile.TemporaryDirectory() as folder:
        engine=create_engine("sqlite:///"+str(Path(folder)/"scratch.db"))
        SQLModel.metadata.create_all(engine)
        reports=[]
        with Session(engine) as session:
            agents=[Agent(name=r,model="not-invoked",role=r,system_prompt="Offline draft only",tools_json="[]",memory_mode="none") for r in ("planner","executor","critic","synthesizer")]
            session.add_all(agents);session.commit()
            team=Team(name="Phi032 scratch");session.add(team);session.commit()
            for packet in packets:
                validate(packet)
                bad=copy.deepcopy(packet);bad["body"]["votes"][0]+=1;refuse(bad)
                bad=copy.deepcopy(packet);bad["body"]["authority"]="PRODUCTION";bad["digest"]=digest(bad["body"]);refuse(bad)
                bad=copy.deepcopy(packet);bad["body"]["query"]["instruction"]="run";bad["digest"]=digest(bad["body"]);refuse(bad)
                run=Run(team_id=team.id,status="pending");session.add(run);session.commit()
                report=stage(session,packet,agents,run.id)
                assert report["authority"]=="NONE" and report["executionPerformed"] is False
                assert len(report["subgoalIds"])==4 and len(report["handoffIds"])==3
                assert report["workerHints"]==1 # metadata only, never dispatched
                reports.append((run.id,report));checks+=6
        # Independent session verifies durable plan and handoff metadata.
        with Session(engine) as session:
            for run_id,r in reports:
                listing=list_plan(session,run_id)
                assert [s.id for s in listing["subgoals"]]==r["subgoalIds"]
                assert all(s.status=="pending" for s in listing["subgoals"])
                assert all(not session.get(AgentHandoff,i).allow_tools and not session.get(AgentHandoff,i).allow_memory and session.get(AgentHandoff,i).status=="open" for i in r["handoffIds"])
                trace=collaboration_trace(session,run_id)
                assert [t["event_type"] for t in trace]==["team_plan_created","agent_handoff","agent_handoff","agent_handoff"]
                assert session.get(Run,run_id).status=="pending";checks+=5
        engine.dispose()
    print(json.dumps({"status":"passed","checks":checks,"plans":12,"subgoals":48,"handoffs":36,"executionPerformed":False}))
if __name__=="__main__": main(sys.argv[1])
