// Φ026 context-bound, shadow-only protocol.
function protocol(){
 const fixed=[4,4,4],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),valid=w=>Array.isArray(w)&&w.length===3&&w.every(x=>[0,4,8].includes(x)),sum=a=>a.reduce((n,x)=>n+x,0),exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),must=(v,m)=>{if(!v)throw Error(m)};
 function replay(events,env){
  must(Array.isArray(events)&&events.length<=90&&typeof env.session==="string"&&env.session.length<=80,"input");
  let context=null,pending=null,attempts=0,charged=0;const nodes=[{id:0,parent:null,weights:fixed.slice()}],closed=[];
  for(const e of events){
   if(e?.kind==="context"){
    must(exact(e,"kind,body,signature")&&!pending,"context boundary");const b=e.body;
    must(exact(b,"session,epoch,world,suite,commitment")&&b.session===env.session&&b.epoch===(context?context.body.epoch+1:1)&&b.epoch<=18&&["aligned","shifted"].includes(b.world)&&b.suite==="phi026-eval-v1"&&/^[a-f0-9]{64}$/.test(b.commitment)&&env.verify("context",b,e.signature),"context authority");
    context=e;
   }else if(e?.kind==="proposal"){
    must(exact(e,"kind,body,signature")&&context&&!pending&&attempts<18,"proposal boundary");const b=e.body;
    must(exact(b,"session,id,parent,context,incumbent,weights,mode,sources,budget")&&b.session===env.session&&b.id===attempts+1&&b.parent===nodes.length-1&&b.context===env.hash(context)&&same(b.incumbent,nodes.at(-1).weights)&&valid(b.weights)&&!same(b.weights,b.incumbent)&&b.budget===2592&&env.verify("operator",b,e.signature),"proposal");
    must(Array.isArray(b.sources)&&b.sources.every(x=>Number.isInteger(x)&&x>=0&&x<nodes.length),"sources");
    if(b.mode==="learn")must(b.sources.length===0,"learn");
    else if(b.mode==="recall")must(b.sources.length===1&&same(b.weights,nodes[b.sources[0]].weights),"recall");
    else if(b.mode==="compose")must(b.sources.length===3&&b.weights.every((x,i)=>x===nodes[b.sources[i]].weights[i]),"compose");
    else throw Error("mode");
    attempts++;charged+=b.budget;pending={proposal:e,receipt:null};
   }else if(e?.kind==="receipt"){
    must(exact(e,"kind,body,signature")&&pending&&!pending.receipt,"receipt boundary");const b=e.body;
    must(exact(b,"session,proposal,context,commitment,protocol,cost,baseline,incumbent,candidate")&&b.session===env.session&&b.proposal===env.hash(pending.proposal)&&b.context===env.hash(context)&&b.commitment===context.body.commitment&&b.protocol==="phi026-eval-v1"&&b.cost===pending.proposal.body.budget&&[b.baseline,b.incumbent,b.candidate].every(v=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isInteger(x)&&x>=0&&x<=12))&&env.verify("evaluator",b,e.signature),"receipt");
    pending.receipt=e;
   }else if(e?.kind==="decision"){
    must(exact(e,"kind,body,signature")&&pending,"decision boundary");const b=e.body;
    must(exact(b,"session,proposal,receipt,choice")&&b.session===env.session&&b.proposal===env.hash(pending.proposal)&&b.receipt===(pending.receipt?env.hash(pending.receipt):null)&&["approve","reject","abandon"].includes(b.choice)&&env.verify("operator",b,e.signature),"decision");
    if(b.choice==="approve"){
     must(pending.receipt,"missing evidence");const m=pending.receipt.body;
     must(m.candidate.every((n,i)=>n>=m.incumbent[i]&&n>=m.baseline[i])&&sum(m.candidate)>=sum(m.incumbent)+2,"evidence gate");
     nodes.push({id:nodes.length,parent:pending.proposal.body.parent,weights:pending.proposal.body.weights.slice()});
    }
    if(b.choice==="abandon")must(!pending.receipt,"evaluated");
    closed.push({id:pending.proposal.body.id,epoch:context.body.epoch,choice:b.choice});pending=null;
   }else throw Error("event");
  }
  return {session:env.session,context,pending,nodes,closed,attempts,charged,shadow:nodes.at(-1).weights.slice(),production:fixed.slice(),authority:"SHADOW_ONLY"};
 }
 return {replay};
}
function evaluate(world,seed,incumbent,candidate){
 if(!["aligned","shifted"].includes(world)||!Number.isInteger(seed)||seed<1||seed>2147483647||![incumbent,candidate].every(w=>Array.isArray(w)&&w.length===3&&w.every(x=>[0,4,8].includes(x))))throw Error("fixture");
 const axes=world==="aligned"?[8,0,8]:[0,8,0];let s=seed>>>0,cost=0;
 const rand=n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)};
 const baseline=[],current=[],proposed=[];
 for(let i=0;i<3;i++){
  const label=(x,y)=>Math.floor((axes[i]===8?x:y)/3),rows=n=>Array.from({length:n},()=>{const x=rand(9),y=rand(9);return {x,y,label:label(x,y)}});
  const memory=rows(24),queries=rows(12);
  const score=w=>{let n=0;for(const q of queries){let best=Infinity,pred=-1;for(const m of memory){cost++;const d=w*Math.abs(q.x-m.x)+(8-w)*Math.abs(q.y-m.y);if(d<best){best=d;pred=m.label}}if(pred===q.label)n++}return n};
  baseline.push(score(4));current.push(score(incumbent[i]));proposed.push(score(candidate[i]));
 }
 return {protocol:"phi026-eval-v1",cost,baseline,incumbent:current,candidate:proposed};
}
export const {replay}=protocol();
export {evaluate};
