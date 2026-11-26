// Φ027 provenance adapter. Uses unchanged Φ026 replay and Φ025 planner via trusted host.
function provenance(){
 const exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),must=(v,m)=>{if(!v)throw Error(m)};
 const domain=(kind,body)=>["phi027-v1",kind,body];
 function replay(events,env){
  must(Array.isArray(events)&&events.length<=108,"event cap");
  const legacy=[],discoveries=[],lineage=[];let state=env.replay(legacy,env),pendingDiscovery=null,planning=0;
  for(const e of events){
   if(e?.kind==="discovery"){
    must(exact(e,"kind,body,signature")&&state.context&&!state.pending&&!pendingDiscovery&&state.attempts<18&&discoveries.length<18,"discovery boundary");
    const b=e.body;
    must(exact(b,"session,id,history,context,seed,policy,reportHash,targetCost,sourceCost,proposal")&&b.session===env.session&&b.id===discoveries.length+1&&b.history===env.hash(legacy)&&b.context===env.hash(state.context)&&Number.isInteger(b.seed)&&b.seed>=1&&b.seed<=900&&["local","hybrid"].includes(b.policy)&&env.verify("planner",domain(e.kind,b),e.signature),"discovery signature or binding");
    const report=env.plan(state,b.seed,state.context.body.world,b.policy);
    must(b.reportHash===env.hash(report)&&same(b.proposal,report.proposal)&&b.targetCost===report.targetCost&&b.sourceCost===report.sourceCost&&Number.isInteger(b.targetCost)&&b.targetCost>=0&&b.targetCost<=16000&&Number.isInteger(b.sourceCost)&&b.sourceCost>=0&&b.sourceCost<=4320,"discovery recomputation");
    planning+=b.targetCost+b.sourceCost;
    discoveries.push({id:b.id,hash:env.hash(e),context:b.context,reportHash:b.reportHash,targetCost:b.targetCost,sourceCost:b.sourceCost,outcome:b.proposal?"pending":"no-candidate"});
    if(b.proposal)pendingDiscovery=e;
   }else if(e?.kind==="submit"){
    must(exact(e,"kind,body,signature")&&pendingDiscovery&&!state.pending,"submit boundary");
    const b=e.body,d=pendingDiscovery.body,p=b.proposal;
    must(exact(b,"session,discovery,proposal")&&b.session===env.session&&b.discovery===env.hash(pendingDiscovery)&&env.verify("operator",domain(e.kind,b),e.signature),"submit binding");
    must(p?.kind==="proposal"&&same({mode:p.body.mode,sources:p.body.sources,weights:p.body.weights},d.proposal),"candidate substitution");
    state=env.replay([...legacy,p],env);legacy.push(p);
    discoveries.at(-1).outcome="submitted";lineage.push({attempt:p.body.id,discovery:b.discovery,proposal:env.hash(p),context:d.context,reportHash:d.reportHash,receipt:null,decision:null,node:null});
    pendingDiscovery=null;
   }else if(e?.kind==="discard"){
    must(exact(e,"kind,body,signature")&&pendingDiscovery&&!state.pending&&exact(e.body,"session,discovery")&&e.body.session===env.session&&e.body.discovery===env.hash(pendingDiscovery)&&env.verify("operator",domain(e.kind,e.body),e.signature),"discard");
    discoveries.at(-1).outcome="discarded";pendingDiscovery=null;
   }else{
    must(!pendingDiscovery&&["context","receipt","decision"].includes(e?.kind),"unbound transition");
    const next=env.replay([...legacy,e],env);
    if(e.kind==="receipt"){must(lineage.length&&state.pending,"receipt provenance");lineage.at(-1).receipt=env.hash(e)}
    if(e.kind==="decision"){must(lineage.length&&state.pending,"decision provenance");const row=lineage.at(-1);row.decision=env.hash(e);row.outcome=e.body.choice;if(e.body.choice==="approve")row.node=next.nodes.at(-1).id}
    state=next;legacy.push(e);
   }
  }
  return {state,discoveries,lineage,pendingDiscovery,planningComparisons:planning,reservedEvaluationComparisons:state.charged,authority:"SHADOW_ONLY"};
 }
 function makeDiscovery(events,env,seed,policy,sign){
  const current=replay(events,env),state=current.state;
  must(state.context&&!state.pending&&!current.pendingDiscovery&&current.discoveries.length<18&&state.attempts<18,"discovery boundary");
  const legacy=events.flatMap(e=>e.kind==="submit"?[e.body.proposal]:["context","receipt","decision"].includes(e.kind)?[e]:[]);
  const report=env.plan(state,seed,state.context.body.world,policy),body={session:env.session,id:current.discoveries.length+1,history:env.hash(legacy),context:env.hash(state.context),seed,policy,reportHash:env.hash(report),targetCost:report.targetCost,sourceCost:report.sourceCost,proposal:report.proposal};
  return {kind:"discovery",body,signature:sign("planner",domain("discovery",body))};
 }
 return {replay,makeDiscovery,domain};
}
export const {replay,makeDiscovery,domain}=provenance();
