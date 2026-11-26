import copy
import json
import sys
import tempfile
from pathlib import Path
from sqlmodel import SQLModel, Session, create_engine
from app.models import Agent, Team, Run, AgentHandoff
from app.core.config import settings
from phios.covenant import BoundaryTransitionRequest, TrustZone, IdentitySeal
from phios.mandala import AuthorityProjection, AuthoritativeAuthorityEvent, AuthorityEventKind
from phi032_agentora_bridge import stage, digest
from phi033_phios_bridge import review, verify_review, validate_manifest

def main(packet_path,genesis,agentora,altermath,phios):
    packets=json.loads(Path(packet_path).read_text())
    roots={"PhiGenesis":genesis,"Agentora":agentora,"Altermath":altermath,"PhiOS":phios}
    assert len(packets)==12
    settings.agentora_enable_team_debate=True
    settings.agentora_enable_single_agent_fallback=True
    settings.agentora_max_team_turns=3
    settings.agentora_max_tool_steps=1
    checks=0
    def refuse(fn):
        nonlocal checks
        try: fn()
        except (ValueError,KeyError,TypeError): checks+=1;return
        raise AssertionError("expected refusal")
    with tempfile.TemporaryDirectory() as folder:
        engine=create_engine("sqlite:///"+str(Path(folder)/"scratch.db"))
        SQLModel.metadata.create_all(engine)
        rows=[]
        with Session(engine) as s:
            agents=[Agent(name=r,model="not-invoked",role=r,system_prompt="Offline only",tools_json="[]",memory_mode="none") for r in ("planner","executor","critic","synthesizer")]
            s.add_all(agents);s.commit()
            team=Team(name="Phi033 scratch");s.add(team);s.commit()
            for packet in packets:
                run=Run(team_id=team.id,status="pending");s.add(run);s.commit()
                draft=stage(s,packet,agents,run.id)
                result=review(s,run.id,packet,draft,roots)
                assert result["zone"]=="BOUNDED" and result["status"]=="HELD" and result["authority"]=="NONE";checks+=1
                assert [r["status"] for r in result["receipts"]]==["ACCEPTED","ACCEPTED","ACCEPTED","HELD"];checks+=1
                assert all(not r["action_authority"] and not r["execution_authority"] for r in result["receipts"]);checks+=1
                assert not result["seal"]["trusted_identity"] and result["projection"]["grants"]==[];checks+=1
                assert verify_review(s,run.id,packet,draft,roots,result);checks+=1
                bad=copy.deepcopy(packet);bad["body"]["authority"]="PRODUCTION";bad["digest"]=digest(bad["body"]);refuse(lambda:review(s,run.id,bad,draft,roots))
                bad=copy.deepcopy(draft);bad["executionPerformed"]=True;refuse(lambda:review(s,run.id,packet,bad,roots))
                bad=copy.deepcopy(result);bad["receipts"][-1]["execution_authority"]=True;refuse(lambda:verify_review(s,run.id,packet,draft,roots,bad))
                bad=copy.deepcopy(result);bad["draft"]["workerHints"]=0;refuse(lambda:verify_review(s,run.id,packet,draft,roots,bad))
                bad=copy.deepcopy(result["manifest"]);bad["pins"]["PhiOS"]="wrong";refuse(lambda:validate_manifest(bad))
                seal=result["seal"]["seal_sha256"]
                refuse(lambda:BoundaryTransitionRequest(source_zone=TrustZone.BOUNDED,target_zone=TrustZone.ROOT,subject_seal_sha256=seal))
                refuse(lambda:BoundaryTransitionRequest(source_zone=TrustZone.INTAKE,target_zone=TrustZone.GOVERNED_EXECUTION,subject_seal_sha256=seal))
                rows.append((run.id,packet,draft,result))
        with Session(engine) as s:
            for run_id,packet,draft,result in rows:
                assert verify_review(s,run_id,packet,draft,roots,result);checks+=1
            run_id,packet,draft,result=rows[0]
            h=s.get(AgentHandoff,draft["handoffIds"][0]);h.allow_tools=True;s.add(h);s.commit()
            refuse(lambda:verify_review(s,run_id,packet,draft,roots,result))
        engine.dispose()
    forged=AuthoritativeAuthorityEvent(event_id="test-only",sequence=0,kind=AuthorityEventKind.GRANT,permission="execute",authority_source="test-fixture",effective_at="2026-01-01T00:00:00+00:00")
    refuse(lambda:AuthorityProjection.project(ceiling=(),events=(forged,),observed_at="2026-01-01T00:00:00+00:00"))
    print(json.dumps({"status":"passed","checks":checks,"reviews":len(rows),"accepted_descriptive_transitions":len(rows)*3,"held_execution_transitions":len(rows),"authority":"NONE"}))
if __name__=="__main__": main(*sys.argv[1:])
