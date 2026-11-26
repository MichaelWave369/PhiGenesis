"""Produce an offline, reproducibly reviewed batch using existing integration code."""
import copy
import json
import sys
import tempfile
from pathlib import Path
from sqlmodel import SQLModel, Session, create_engine
from app.models import Agent, Team, Run, AgentHandoff
from app.core.config import settings
from phi032_agentora_bridge import stage
from phi033_phios_bridge import review, verify_review

def main(packet_path,genesis,agentora,altermath,phios):
    packets=json.loads(Path(packet_path).read_text())
    roots={"PhiGenesis":genesis,"Agentora":agentora,"Altermath":altermath,"PhiOS":phios}
    assert len(packets)==12
    settings.agentora_enable_team_debate=True
    settings.agentora_enable_single_agent_fallback=True
    settings.agentora_max_team_turns=3
    settings.agentora_max_tool_steps=1
    rows=[]
    with tempfile.TemporaryDirectory() as folder:
        engine=create_engine("sqlite:///"+str(Path(folder)/"scratch.db"))
        SQLModel.metadata.create_all(engine)
        with Session(engine) as s:
            agents=[Agent(name=r,model="not-invoked",role=r,system_prompt="Offline only",tools_json="[]",memory_mode="none") for r in ("planner","executor","critic","synthesizer")]
            s.add_all(agents);s.commit()
            team=Team(name="Phi034 scratch");s.add(team);s.commit()
            for packet in packets:
                run=Run(team_id=team.id,status="pending");s.add(run);s.commit()
                draft=stage(s,packet,agents,run.id)
                result=review(s,run.id,packet,draft,roots)
                rows.append((run.id,packet,draft,result))
        with Session(engine) as s:
            for run_id,packet,draft,result in rows:
                assert verify_review(s,run_id,packet,draft,roots,result)
                assert result["status"]=="HELD" and result["authority"]=="NONE"
            run_id,packet,draft,result=rows[0]
            try: verify_review(s,run_id,rows[1][1],draft,roots,result)
            except ValueError: pass
            else: raise AssertionError("cross-packet substitution")
            h=s.get(AgentHandoff,draft["handoffIds"][0]);h.allow_memory=True;s.add(h);s.commit()
            try: verify_review(s,run_id,packet,draft,roots,result)
            except ValueError: pass
            else: raise AssertionError("memory permission drift")
            h.allow_memory=False;s.add(h);s.commit()
            assert verify_review(s,run_id,packet,draft,roots,result)
        engine.dispose()
    print(json.dumps({"schema":"phi034-review-batch-v1","authority":"NONE","rows":[{"packet":p,"review":r} for _,p,_,r in rows]},sort_keys=True,separators=(",",":")))
if __name__=="__main__": main(*sys.argv[1:])
