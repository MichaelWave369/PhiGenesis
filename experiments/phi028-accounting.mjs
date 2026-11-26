// Φ028 attempted-work wrapper over Φ027; no production authority.
function accounting(){
 const exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),must=(v,m)=>{if(!v)throw Error(m)};
 const domain=(kind,body)=>["phi028-v1",kind,body];
 function replay(events,env){
  must(Array.isArray(events)&&events.length<=180,"event cap");
  const legacy=[],work=[];let current=env.replay(legacy,env),pending=null,evalWork=null;
  for(let i=0;i<events.length;i++){
   const e=events[i],b=e?.body;
   if(["reserve","start","abandon-work","eval-start"].includes(e?.kind)){
    must(exact(e,"kind,body,signature")&&b?.session===env.session&&b.history===env.hash(events.slice(0,i))&&env.verify("operator",domain(e.kind,b),e.signature),"work binding");
   }
   if(e?.kind==="reserve"){
    must(exact(b,"session,history,id,context,seed,policy,artifact,budget")&&!pending&&!current.pendingDiscovery&&!current.state.pending&&current.state.context&&current.state.attempts<18&&work.filter(w=>w.type==="planning").length<18,"reservation boundary");
    must(b.id===work.filter(w=>w.type==="planning").length+1&&b.context===env.hash(current.state.context)&&b.artifact===env.artifact&&Number.isInteger(b.seed)&&b.seed>=1&&b.seed<=900&&["local","hybrid"].includes(b.policy)&&b.budget===(b.policy==="local"?16000:20320),"reservation");
    pending={type:"planning",id:b.id,hash:env.hash(e),seed:b.seed,policy:b.policy,reserved:b.budget,status:"reserved",actual:0};work.push(pending);
   }else if(e?.kind==="start"){
    must(exact(b,"session,history,reservation")&&pending&&pending.status==="reserved"&&b.reservation===pending.hash,"start");pending.status="started";
   }else if(e?.kind==="abandon-work"){
    must(exact(b,"session,history,reservation")&&pending&&b.reservation===pending.hash,"abandon");
    pending.status=pending.status==="started"?"uncertain":"unused";pending=null;
   }else if(e?.kind==="eval-start"){
    must(exact(b,"session,history,proposal")&&!pending&&evalWork&&evalWork.status==="reserved"&&b.proposal===evalWork.hash&&current.state.pending&&!current.state.pending.receipt,"eval start");evalWork.status="started";
   }else{
    if(e?.kind==="discovery"){
     must(pending&&pending.status==="started"&&b.seed===pending.seed&&b.policy===pending.policy,"unreserved discovery");
    }else must(!pending,"planning unresolved");
    if(e?.kind==="receipt")must(evalWork?.status==="started","unreserved evaluation");
    const next=env.replay([...legacy,e],env);
    if(e.kind==="discovery"){
     const actual=b.targetCost+b.sourceCost;must(Number.isInteger(actual)&&actual>=0&&actual<=pending.reserved,"planning cost");
     pending.actual=actual;pending.status="completed";pending.result=env.hash(e);pending=null;
    }
    if(e.kind==="submit"){
     must(!evalWork,"evaluation pending");
     evalWork={type:"evaluation",id:b.proposal.body.id,hash:env.hash(b.proposal),reserved:b.proposal.body.budget,status:"reserved",actual:0};work.push(evalWork);
    }
    if(e.kind==="receipt"){must(b.cost===evalWork.reserved,"evaluation cost");evalWork.actual=b.cost;evalWork.status="completed";evalWork.result=env.hash(e)}
    if(e.kind==="decision"){
     must(evalWork,"missing evaluation reservation");
     if(evalWork.status==="reserved")evalWork.status="unused";
     else if(evalWork.status==="started")evalWork.status="uncertain";
     evalWork=null;
    }
    current=next;legacy.push(e);
   }
  }
  const totals={reserved:0,completed:0,uncertain:0,unused:0,open:0};
  for(const w of work){
   totals.reserved+=w.reserved;
   if(w.status==="completed"){totals.completed+=w.actual;totals.unused+=w.reserved-w.actual}
   else if(w.status==="uncertain"||w.status==="started")totals.uncertain+=w.reserved;
   else if(w.status==="unused")totals.unused+=w.reserved;
   else totals.open+=w.reserved;
  }
  must(totals.reserved===totals.completed+totals.uncertain+totals.unused+totals.open,"conservation");
  return {current,legacy,work,pending,evalWork,totals,authority:"SHADOW_ONLY"};
 }
 return {replay,domain};
}
export const {replay,domain}=accounting();
