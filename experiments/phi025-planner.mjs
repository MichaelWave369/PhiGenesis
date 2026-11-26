// Φ025 bounded advisory planner. No signing or persistence authority.
function planner(){
 const base=[4,4,4],values=[0,4,8],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),sum=a=>a.reduce((n,x)=>n+x,0);
 const valid=w=>Array.isArray(w)&&w.length===3&&w.every(x=>values.includes(x));
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function fixture(seed,world,split){
  const peer=Number.isInteger(world),contexts=peer?[world]:[0,1,2],axes=peer?[8,0,8]:world==="shifted"?[0,8,0]:[8,0,8];
  const r=rng(seed*104729+(peer?world+1:11)*1000033+({memory:11,probe:31,confirm:47}[split])*1000003);
  return Array.from({length:contexts.length*(split==="memory"?24:12)},(_,i)=>{const context=contexts[i%contexts.length],x=r(9),y=r(9);return {context,x,y,label:Math.floor((axes[context]===8?x:y)/3)}});
 }
 function plan(state,seed,world,policy="hybrid"){
  if(!Number.isInteger(seed)||seed<1||seed>900||!["aligned","shifted"].includes(world)||!["local","hybrid"].includes(policy))throw Error("fixture");
  if(!state||state.authority!=="SHADOW_ONLY"||!same(state.production,base)||!Array.isArray(state.nodes)||state.nodes.length<1||state.nodes.length>19||!valid(state.shadow)||!same(state.nodes.at(-1).weights,state.shadow)||state.nodes.some((n,i)=>n.id!==i||!valid(n.weights)))throw Error("lineage");
  if(state.pending||!Number.isInteger(state.attempts)||state.attempts<0||state.attempts>=18)throw Error("pending or exhausted");
  let targetCost=0,sourceCost=0;
  function score(m,q,w,source=false){
   let comparisons=0;const per=[0,0,0];for(const x of q){let d=Infinity,label=-1;for(const y of m){if(x.context!==y.context)continue;comparisons++;const weight=w[x.context],dist=weight*Math.abs(x.x-y.x)+(8-weight)*Math.abs(x.y-y.y);if(dist<d){d=dist;label=y.label}}if(label===x.label)per[x.context]++}
   if(source)sourceCost+=comparisons;else targetCost+=comparisons;return {correct:sum(per),per};
  }
  const m=fixture(seed,world,"memory"),p=fixture(seed,world,"probe"),v=fixture(seed,world,"confirm"),cache=new Map(),ranked=[];
  const probe=w=>{const k=w.join(",");if(!cache.has(k))cache.set(k,score(m,p,w));return cache.get(k)};
  const incumbent=probe(state.shadow),reference=probe(base);
  const alarm=incumbent.correct<=reference.correct-2||incumbent.correct<=24;
  const best=rows=>rows.reduce((a,b)=>!a||b.score.correct>a.score.correct?b:a,null);
  function offer(weights,mode,sources,origin){
   if(same(weights,state.shadow)||ranked.some(x=>same(x.weights,weights)))return;
   ranked.push({weights:weights.slice(),mode,sources:sources.slice(),origin,score:probe(weights)});
  }
  const archive=state.nodes.slice(-3);
  for(const n of archive)offer(n.weights,"recall",[n.id],"ancestry");
  const donors=[0,1,2].map(i=>archive.reduce((a,b)=>probe(b.weights).per[i]>probe(a.weights).per[i]?b:a));
  offer(donors.map((n,i)=>n.weights[i]),"compose",donors.map(n=>n.id),"inheritance");
  const local=[0,1,2].map(i=>{
   const rows=values.map(weight=>({weight,score:score(m,p.filter(q=>q.context===i),base.map((x,j)=>j===i?weight:x))}));
   return best(rows).weight;
  });
  offer(local,"learn",[],"local");
  const peers=[];
  if(policy==="hybrid"){
   for(let i=0;i<3;i++){
    const pm=fixture(seed,i,"memory"),pp=fixture(seed,i,"probe"),pv=fixture(seed,i,"confirm");
    const config=w=>base.map((x,j)=>i===j?w:x),rows=values.map(weight=>({weight,score:score(pm,pp,config(weight),true)})),winner=best(rows);
    const candidate=score(pm,pv,config(winner.weight),true),fixed=score(pm,pv,base,true);
    peers.push({id:i,weight:winner.weight,accepted:candidate.correct>=fixed.correct+1,candidate,fixed});
   }
   offer(peers.map(r=>r.accepted?r.weight:4),"learn",[],"peer-assisted");
   offer(peers.map(r=>r.accepted?r.weight:local[r.id]),"learn",[],"peer-local");
  }
  const winner=best(ranked),confirmation=winner?{candidate:score(m,v,winner.weights),incumbent:score(m,v,state.shadow),reference:score(m,v,base)}:null;
  const eligible=!!confirmation&&confirmation.candidate.correct>=confirmation.incumbent.correct+2&&confirmation.candidate.per.every((n,i)=>n>=confirmation.incumbent.per[i]&&n>=confirmation.reference.per[i]);
  if(targetCost>16000||sourceCost>4320)throw Error("planner budget");
  return {schema:"phi025-advisory-v1",seed,world,policy,parent:state.nodes.at(-1).id,attempts:state.attempts,alarm,incumbent,reference,ranked,peers,confirmation,targetCost,sourceCost,totalCost:targetCost+sourceCost,proposal:eligible?{mode:winner.mode,sources:winner.sources,weights:winner.weights}:null,authority:"NONE"};
 }
 function guard(operator,witness){
  if(!operator||!witness||operator.head!==witness.head||!same(operator.state,witness.state))throw Error("unwitnessed operator state");
  return witness.state;
 }
 function test(){
  let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++},deny=f=>{try{f();return false}catch{return true}};
  const s={authority:"SHADOW_ONLY",production:base,shadow:base,nodes:[{id:0,weights:base}],pending:null,attempts:0};
  for(const world of ["aligned","shifted"])for(const policy of ["local","hybrid"])for(const seed of [1,7,19,90]){
   const r=plan(s,seed,world,policy);assert(same(r,plan(s,seed,world,policy)),"deterministic");
   assert(r.targetCost<=16000&&r.sourceCost===(policy==="hybrid"?4320:0)&&r.totalCost===r.targetCost+r.sourceCost,"budget");
   assert(r.authority==="NONE"&&(!r.proposal||valid(r.proposal.weights)),"bounded");
   assert(r.ranked.length<=6,"candidate cap");
  }
  assert(deny(()=>plan({...s,pending:{}},1,"aligned")),"pending");
  assert(deny(()=>plan({...s,attempts:18},1,"aligned")),"exhausted");
  assert(deny(()=>guard({head:"a",state:s},{head:"b",state:s})),"head mismatch");
  assert(deny(()=>guard({head:"a",state:s},{head:"a",state:{...s,attempts:1}})),"state mismatch");
  assert(same(guard({head:"a",state:s},{head:"a",state:s}),s),"guard");
  const t={...s,shadow:[8,0,8],nodes:[...s.nodes,{id:1,weights:[8,0,8]}],attempts:1};
  const u=plan(t,1,"shifted");assert(u.alarm,"drift");assert(same(t.shadow,[8,0,8]),"no mutation");
  return {checks,status:"passed"};
 }
 return {plan,guard,test};
}
export const {plan,guard,test}=planner();
