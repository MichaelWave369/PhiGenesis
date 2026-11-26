// Φ023 finite governance replay; only shadow configurations can change.
function protocol(){
 const baseline=[4,4,4],budget=1458,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),valid=w=>Array.isArray(w)&&w.length===3&&w.every(x=>[0,4,8].includes(x)),exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),sum=a=>a.reduce((n,x)=>n+x,0);
 const require=(v,m)=>{if(!v)throw Error(m)};
 function replay(events,verify,session){
  require(typeof session==="string"&&/^[a-zA-Z0-9-]{1,80}$/.test(session),"session");require(Array.isArray(events)&&events.length<=54,"event cap");
  const nodes=[{id:0,parent:null,sources:[],weights:baseline.slice()}],closed=[];let pending=null,attempts=0,charged=0;
  for(const e of events){
   require(e&&typeof e==="object","event");
   if(e.kind==="proposal"){
    require(exact(e,"kind,id,session,parent,incumbent,weights,mode,sources,budget")&&!pending&&attempts<18&&e.id===attempts+1&&e.session===session&&e.parent===nodes.length-1&&same(e.incumbent,nodes[e.parent].weights)&&valid(e.weights)&&!same(e.weights,e.incumbent)&&e.budget===budget,"proposal");
    require(Array.isArray(e.sources)&&e.sources.every(x=>Number.isInteger(x)&&x>=0&&x<nodes.length),"sources");
    if(e.mode==="learn")require(e.sources.length===0,"learn");
    else if(e.mode==="recall")require(e.sources.length===1&&same(e.weights,nodes[e.sources[0]].weights),"recall");
    else if(e.mode==="compose")require(e.sources.length===3&&e.weights.every((x,i)=>x===nodes[e.sources[i]].weights[i]),"compose");
    else throw Error("mode");
    attempts++;charged+=budget;pending={proposal:e,receipt:null};
   }else if(e.kind==="receipt"){
    require(exact(e,"kind,metrics,signature")&&pending&&!pending.receipt,"receipt");
    const m=e.metrics;
    require(exact(m,"protocol,cost,baseline,incumbent,candidate")&&m.protocol==="phi023-eval-v1"&&m.cost===budget&&[m.baseline,m.incumbent,m.candidate].every(v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isInteger(n)&&n>=0&&n<=9)),"metrics");
    require(verify("evaluator",[pending.proposal,m],e.signature),"receipt signature");pending.receipt=e;
   }else if(e.kind==="decision"){
    require(exact(e,"kind,choice,signature")&&pending&&["approve","reject","abandon"].includes(e.choice),"decision");
    require(verify("operator",[pending.proposal,pending.receipt,e.choice],e.signature),"decision signature");
    if(e.choice==="approve"){
     require(pending.receipt,"missing receipt");const m=pending.receipt.metrics;
     require(m.candidate.every((n,i)=>n>=m.incumbent[i]&&n>=m.baseline[i])&&sum(m.candidate)>=sum(m.incumbent)+2,"incumbent evidence gate");
     nodes.push({id:nodes.length,parent:pending.proposal.parent,sources:pending.proposal.sources.slice(),weights:pending.proposal.weights.slice()});
    }
    if(e.choice==="abandon")require(!pending.receipt,"abandon only unresolved");
    closed.push({id:pending.proposal.id,choice:e.choice,receipt:!!pending.receipt});pending=null;
   }else throw Error("event kind");
  }
  return {session,attempts,charged,closed,pending,nodes,shadow:nodes[nodes.length-1].weights.slice(),production:baseline.slice(),authority:"SHADOW_ONLY"};
 }
 return {replay};
}
export const {replay}=protocol();
