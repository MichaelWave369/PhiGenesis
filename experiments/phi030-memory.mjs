// Φ030 bounded synthetic experiential memory; no production authority.
function chamber(){
 const policies=["recent","age-weighted","consolidated","context-tagged"],regimes=["stationary","recurrent","delayed","contradictory"],epochs=24,capacity=72,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=x=>JSON.parse(JSON.stringify(x));
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 const tag=(regime,e)=>regime==="stationary"?0:Math.floor(e/6)%2;
 function fixture(seed,regime,e,split){
  const r=rng(seed*104729+(e+1)*1000033+(split==="observe"?13:47)*1000003),phase=tag(regime,e);
  return Array.from({length:split==="observe"?18:36},(_,i)=>{
   const context=i%3,x=r(9),y=r(9),axis=(context===1?1:0)^phase,label=Math.floor((axis?y:x)/3);
   if(split==="test")return {context,x,y,label};
   const delay=regime==="delayed"?2+r(4):1+r(3),missing=r(10)<(regime==="delayed"?3:1);
   const noisy=regime==="contradictory"&&r(5)===0;
   return {id:e*18+i,epoch:e,tag:phase,context,x,y,due:missing?null:e+delay,label:noisy?(label+1+r(2))%3:label};
  });
 }
 function initial(seed,regime,policy){
  if(!Number.isInteger(seed)||seed<1||seed>900||!regimes.includes(regime)||!policies.includes(policy))throw Error("configuration");
  return {schema:"phi030-v1",seed,regime,policy,next:0,memory:[],pending:[],events:[],authority:"NONE"};
 }
 function step(state){
  if(state.next>=epochs)throw Error("finished");const s=copy(state),e=s.next,phase=tag(s.regime,e);
  const arrivals=s.pending.filter(x=>x.due===e);
  s.pending=s.pending.filter(x=>x.due>e);
  const memory=[...s.memory,...arrivals];
  // Equal total capacity; context-tagged retention divides capacity across two observed tags.
  const newest=(a,b)=>b.epoch-a.epoch||b.id-a.id;
  if(s.policy==="context-tagged")s.memory=[0,1].flatMap(t=>memory.filter(x=>x.tag===t).sort(newest).slice(0,capacity/2));
  else s.memory=memory.sort(newest).slice(0,capacity);
  const tests=fixture(s.seed,s.regime,e,"test");let correct=0,answered=0,comparisons=0,conflicts=0,stale=0;
  for(const q of tests){
   const rows=s.memory.filter(x=>x.context===q.context&&(s.policy!=="context-tagged"||x.tag===phase));
   let best=Infinity,votes=[0,0,0],bestRows=[];
   // fixed geometry: labels may drift; policies differ in retrieval, not oracle access to target axis
   for(const m of rows){
    comparisons++;
    const d=Math.abs(q.x-m.x)+Math.abs(q.y-m.y)+(s.policy==="age-weighted"?0.75*(e-m.epoch):0);
    if(d<best){best=d;votes=[0,0,0];bestRows=[]}
    if(d===best){votes[m.label]++;bestRows.push(m)}
   }
   if(!bestRows.length)continue;
   let pred;
   if(s.policy==="consolidated"){
    // Equal-distance evidence votes; ties abstain instead of asserting uncertain labels.
    const max=Math.max(...votes);if(votes.filter(v=>v===max).length!==1){conflicts++;continue}
    pred=votes.indexOf(max);if(votes.filter(v=>v>0).length>1)conflicts++;
   }else pred=bestRows.sort(newest)[0].label;
   answered++;correct+=Number(pred===q.label);stale+=Number(bestRows.every(m=>m.tag!==phase));
  }
  const observed=fixture(s.seed,s.regime,e,"observe"),available=observed.filter(x=>x.due!==null);
  // Pending labels stay in simulator transport, never in retrievable memory before arrival.
  s.pending.push(...available);
  s.events.push({epoch:e,tag:phase,arrived:arrivals.length,missing:observed.length-available.length,retained:s.memory.length,queued:s.pending.length,correct,answered,comparisons,conflicts,stale});
  s.next++;return s;
 }
 function run(seed,regime,policy,until=epochs){if(!Number.isInteger(until)||until<0||until>epochs)throw Error("epoch bound");let s=initial(seed,regime,policy);while(s.next<until)s=step(s);return s}
 function restore(snapshot){if(!snapshot||!same(snapshot,run(snapshot.seed,snapshot.regime,snapshot.policy,snapshot.next)))throw Error("snapshot mismatch");return copy(snapshot)}
 function report(seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seeds");const rows=[];
  for(const regime of regimes)for(const policy of policies){
   let correct=0,answered=0,comparisons=0,conflicts=0,stale=0,returnCorrect=0,retained=0,missing=0;
   for(let seed=1;seed<=seeds;seed++){const s=run(seed,regime,policy);for(const e of s.events){correct+=e.correct;answered+=e.answered;comparisons+=e.comparisons;conflicts+=e.conflicts;stale+=e.stale;retained+=e.retained;missing+=e.missing;if(e.epoch>=12)returnCorrect+=e.correct}}
   const total=seeds*epochs*36;
   rows.push({regime,policy,accuracy:correct/total,coverage:answered/total,conditionalAccuracy:answered?correct/answered:0,returnAccuracy:returnCorrect/(seeds*12*36),meanComparisons:comparisons/seeds,meanRetained:retained/(seeds*epochs),conflicts,stale,missing});
  }return {schema:"phi030-v1",status:"SIMULATED",authority:"NONE",seeds,epochs,capacity,rows};
 }
 function test(){
  let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++},deny=f=>{try{f();return false}catch{return true}};
  for(const regime of regimes)for(const policy of policies)for(const seed of [1,7,19]){
   const full=run(seed,regime,policy),part=restore(JSON.parse(JSON.stringify(run(seed,regime,policy,9))));
   let resumed=part;while(resumed.next<epochs)resumed=step(resumed);
   assert(same(full,resumed),"resume");assert(full.authority==="NONE","authority");
   for(let e=0;e<=epochs;e++){
    const s=run(seed,regime,policy,e);
    assert(s.memory.length<=capacity&&new Set(s.memory.map(x=>x.id)).size===s.memory.length,"capacity");
    assert(s.memory.every(x=>x.due!==null&&x.due<e&&x.epoch<x.due),"no early labels");
    assert(s.pending.every(x=>x.due>=e)&&s.pending.length<=90,"pending bound");
    assert(s.events.every(x=>x.correct<=x.answered&&x.answered<=36&&x.comparisons<=36*capacity),"metrics");
   }
   const bad=copy(part);bad.memory.push({id:-1});assert(deny(()=>restore(bad)),"tamper");
  }
  assert(same(report(2),report(2)),"determinism");assert(deny(()=>report(0)),"bounds");return {checks,status:"passed"};
 }
 return {run,step,restore,report,test};
}
export const {run,step,restore,report,test}=chamber();
