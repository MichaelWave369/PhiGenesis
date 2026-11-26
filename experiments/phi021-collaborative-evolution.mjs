// ΦGenesis Φ021 — bounded collaborative discovery.
function chamber(){
 const values=[0,4,8],base=[4,4,4],options=values.flatMap(a=>values.flatMap(b=>values.map(c=>[a,b,c]))),regimes=["aligned","partial-drift","coupled","altered-transfer"],policies=["fixed","local-factorized","local-exhaustive","peer-only","peer-fallback"],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=x=>JSON.parse(JSON.stringify(x));
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function fixture(seed,world,split){
  const peer=typeof world==="number",contexts=peer?1:world==="coupled"?4:3;
  const r=rng(seed*104729+(peer?world+1:11)*1000033+({memory:11,probe:31,confirm:47,test:61}[split])*1000003);
  return Array.from({length:contexts*(split==="memory"?24:split==="test"?18:12)},(_,i)=>{
   const context=peer?world:i%contexts,x=r(9),y=r(9),w=peer?[8,0,8][world]:context===3?0:world==="partial-drift"?[8,8,4][context]:[8,0,8][context];
   return {context,x,y,label:w===8?Math.floor(x/3):w===0?Math.floor(y/3):Math.floor((x+y)/6)};
  });
 }
 function score(memory,queries,w){
  let correct=0,comparisons=0;const per=[0,0,0,0];
  for(const q of queries){let best=Infinity,pred=-1;const weight=q.context===3?(w.filter(x=>x===8).length%2===0?8:0):w[q.context];
   for(const m of memory){if(m.context!==q.context)continue;comparisons++;const d=weight*Math.abs(q.x-m.x)+(8-weight)*Math.abs(q.y-m.y);if(d<best){best=d;pred=m.label}}
   if(pred===q.label){correct++;per[q.context]++}
  }return {correct,per,comparisons};
 }
 function acquire(seed,id){
  const m=fixture(seed,id,"memory"),p=fixture(seed,id,"probe"),v=fixture(seed,id,"confirm");
  let comparisons=0;const measured=(q,w)=>{const s=score(m,q,base.map((x,i)=>i===id?w:x));comparisons+=s.comparisons;return s.correct};
  const ranked=values.map(weight=>({weight,correct:measured(p,weight)}));const winner=ranked.reduce((a,b)=>b.correct>a.correct?b:a);
  const verified=measured(v,winner.weight),reference=measured(v,4);
  const record=verified>=reference+1?{schema:1,peer:id,pocket:id,weight:winner.weight,verified,reference}:null;
  return {id,ranked,verified,reference,record,comparisons};
 }
 // Exact match against trusted simulator-issued record. Not a network security protocol.
 function receive(record,issued){
  if(!record||Object.keys(record).sort().join(",")!=="peer,pocket,reference,schema,verified,weight"||record.schema!==1||!Number.isInteger(record.peer)||record.peer<0||record.peer>2||record.pocket!==record.peer||!values.includes(record.weight)||!issued||!same(record,issued))return false;
  return true;
 }
 function trial(seed,regime,policy){
  if(!Number.isInteger(seed)||seed<1||seed>900||!regimes.includes(regime)||!policies.includes(policy))throw Error("trial");
  const peers=[0,1,2].map(id=>acquire(seed,id)),sourceCost=peers.reduce((n,p)=>n+p.comparisons,0),usesPeers=policy.startsWith("peer");
  const m=fixture(seed,regime,"memory"),p=fixture(seed,regime,"probe"),v=fixture(seed,regime,"confirm"),q=fixture(seed,regime,"test");
  let targetCost=0,bytes=0;const transfers=[],cache=new Map(),local=[];
  const measured=(queries,w)=>{const s=score(m,queries,w);targetCost+=s.comparisons;return s};
  const probe=w=>{const key=w.join(",");if(!cache.has(key))cache.set(key,measured(p,w));return cache.get(key)};
  const refProbe=probe(base);
  let suggestion=base.slice(),fallback=false;
  if(usesPeers)for(const peer of peers){
   if(!peer.record)continue;
   const record=copy(peer.record);
   if(regime==="altered-transfer"&&peer.id===1)record.weight=(record.weight+4)%12;
   bytes+=JSON.stringify(record).length;const accepted=receive(record,peer.record);
   transfers.push({record,accepted});if(accepted)suggestion[record.pocket]=record.weight;
  }
  function factorized(){
   const w=base.slice();
   for(let i=0;i<3;i++){
    const rows=values.map(weight=>{const config=base.map((x,j)=>j===i?weight:x),result=score(m,p.filter(x=>x.context===i),config);targetCost+=result.comparisons;return {weight,correct:result.correct}});
    const best=rows.reduce((a,b)=>b.correct>a.correct?b:a);w[i]=best.weight;local.push({pocket:i,rows});
   }return w;
  }
  let winner=base.slice();
  const choose=weights=>{for(const w of weights)if(probe(w).correct>probe(winner).correct)winner=w.slice()};
  if(policy==="local-factorized")choose([factorized()]);
  if(policy==="local-exhaustive")choose(options);
  if(usesPeers){
   choose([suggestion]);
   // Escalate on low absolute probe quality, missing peer evidence or a rejected transfer.
   if(policy==="peer-fallback"&&(probe(suggestion).correct<p.length-2||transfers.filter(t=>t.accepted).length<3)){
    fallback=true;choose([factorized()]);
   }
  }
  const proposed=measured(v,winner),reference=measured(v,base);
  const eligible=!same(winner,base)&&proposed.correct>=reference.correct+2&&proposed.per.every((n,i)=>n>=reference.per[i]);
  const shadow=eligible?winner:base,heldout=measured(q,shadow),heldoutFixed=measured(q,base);
  return {seed,regime,policy,peers,sourceCost,targetCost,chargedSourceCost:usesPeers?sourceCost:0,fleetCost:sourceCost+targetCost,bytes,transfers,suggestion,fallback,local,probes:[...cache.entries()],winner,proposed,reference,eligible,shadow:shadow.slice(),heldout,heldoutFixed,active:base.slice(),authority:"NONE"};
 }
 function replay(t){if(!same(t,trial(t.seed,t.regime,t.policy)))throw Error("replay");return true}
 function report(seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seeds");const rows=[];
  for(const regime of regimes)for(const policy of policies){
   let correct=0,total=0,target=0,source=0,fleet=0,bytes=0,accepted=0,rejected=0,fallback=0,below=0;
   for(let seed=1;seed<=seeds;seed++){const t=trial(seed,regime,policy);correct+=t.heldout.correct;total+=regime==="coupled"?72:54;target+=t.targetCost;source+=t.chargedSourceCost;fleet+=t.fleetCost;bytes+=t.bytes;accepted+=t.transfers.filter(x=>x.accepted).length;rejected+=t.transfers.filter(x=>!x.accepted).length;fallback+=Number(t.fallback);below+=Number(t.heldout.correct<t.heldoutFixed.correct)}
   rows.push({regime,policy,accuracy:correct/total,meanTarget:target/seeds,meanSource:source/seeds,meanFull:(target+source)/seeds,meanFleet:fleet/seeds,meanTransferBytes:bytes/seeds,accepted,rejected,fallback,belowFixed:below});
  }return {schema:"phi021-v1",status:"SIMULATED",authority:"NONE",seeds,rows};
 }
 function test(){
  let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++},deny=fn=>{try{fn();return false}catch{return true}};
  const r={schema:1,peer:1,pocket:1,weight:8,verified:12,reference:9};
  assert(receive(r,r),"valid transfer");
  for(const bad of [null,{...r,weight:4},{...r,pocket:2},{...r,authority:"ADMIN"},{...r,peer:9},{...r,schema:2}])assert(!receive(bad,r),"invalid transfer");
  for(const regime of regimes)for(const policy of policies)for(const seed of [1,7,19,90]){
   const t=trial(seed,regime,policy),n=regime==="coupled"?4:3;
   assert(replay(t),"replay");assert(same(t.active,base)&&t.authority==="NONE","authority");
   assert(t.sourceCost===3*5*12*24,"source cost");
   assert(t.chargedSourceCost===(policy.startsWith("peer")?t.sourceCost:0)&&t.fleetCost===t.sourceCost+t.targetCost,"scope");
   assert(t.targetCost===(t.probes.length+2)*n*12*24+2*n*18*24+t.local.length*3*12*24,"target cost");
   assert(t.bytes===t.transfers.reduce((s,x)=>s+JSON.stringify(x.record).length,0),"bytes");
   assert(t.transfers.every(x=>x.accepted===receive(x.record,t.peers[x.record.peer].record)),"receipt");
   assert(regime!=="altered-transfer"||t.transfers.every(x=>x.record.peer!==1||!x.accepted),"altered record");
   assert(t.eligible?t.proposed.correct>=t.reference.correct+2&&t.proposed.per.every((x,i)=>x>=t.reference.per[i]):same(t.shadow,base),"gate");
   assert(options.some(w=>same(w,t.shadow)),"allowlist");
   const bad=copy(t);bad.heldout.correct++;assert(deny(()=>replay(bad)),"tamper trace");
  }
  assert(same(report(2),report(2)),"determinism");assert(deny(()=>report(0))&&deny(()=>report(901)),"bounds");return {status:"passed",checks};
 }
 return {report,test};
}
const engine=chamber();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/phi021-collaborative-evolution.mjs [test|report [seeds]]');
