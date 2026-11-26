// Finite shadow-state governance protocol; verification injected by trusted host.
function protocol(){
 const baseline=[4,4,4],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),valid=w=>Array.isArray(w)&&w.length===3&&w.every(x=>[0,4,8].includes(x)),exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(",");
 const assert=(v,m)=>{if(!v)throw Error(m)};
 const body=(p,r)=>[p,r];
 function replay(events,verify,session){
  assert(typeof session==="string"&&/^[a-zA-Z0-9-]{1,80}$/.test(session),"session");assert(Array.isArray(events)&&events.length<=90,"event cap");
  const nodes=[baseline.slice()];let pending=null,attempts=0,charged=0;
  for(const e of events){
   assert(e&&typeof e==="object","event");
   if(e.kind==="proposal"){
    assert(exact(e,"kind,id,session,parent,weights,mode,sources,budget")&&!pending&&attempts<18&&e.id===attempts+1&&e.session===session&&e.parent===nodes.length-1&&valid(e.weights)&&!same(e.weights,nodes[e.parent])&&e.budget===972,"proposal");
    assert(Array.isArray(e.sources)&&e.sources.every(x=>Number.isInteger(x)&&x>=0&&x<nodes.length),"sources");
    if(e.mode==="learn")assert(e.sources.length===0,"learn");
    else if(e.mode==="recall")assert(e.sources.length===1&&same(e.weights,nodes[e.sources[0]]),"recall");
    else if(e.mode==="compose")assert(e.sources.length===3&&e.weights.every((x,i)=>x===nodes[e.sources[i]][i]),"compose");
    else throw Error("mode");
    attempts++;charged+=e.budget;pending={proposal:e,receipt:null};
   }else if(e.kind==="receipt"){
    assert(exact(e,"kind,metrics,signature")&&pending&&!pending.receipt,"receipt");
    const m=e.metrics;
    assert(exact(m,"protocol,cost,reference,candidate")&&m.protocol==="phi022-eval-v1"&&m.cost===pending.proposal.budget&&[m.reference,m.candidate].every(v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isInteger(n)&&n>=0&&n<=9)),"metrics");
    assert(verify("evaluator",body(pending.proposal,m),e.signature),"evaluator signature");pending.receipt=e;
   }else if(e.kind==="decision"){
    assert(exact(e,"kind,choice,signature")&&pending&&["approve","reject"].includes(e.choice),"decision");
    assert(verify("operator",[pending.proposal,pending.receipt,e.choice],e.signature),"operator signature");
    if(e.choice==="approve"){
     assert(pending.receipt,"missing evidence");const m=pending.receipt.metrics;
     assert(m.candidate.every((n,i)=>n>=m.reference[i])&&m.candidate.reduce((a,b)=>a+b,0)>=m.reference.reduce((a,b)=>a+b,0)+2,"failed evidence gate");
     nodes.push(pending.proposal.weights.slice());
    }
    pending=null;
   }else throw Error("event kind");
  }
  return {session,attempts,charged,pending,nodes,shadow:nodes[nodes.length-1].slice(),production:baseline.slice(),authority:"SHADOW_ONLY"};
 }
 return {replay};
}
export const {replay}=protocol();
