// ΦGenesis Φ020 — bounded relational recombination.
function chamber(){
 const baseline=[4,4,4],values=[0,4,8],options=values.flatMap(a=>values.flatMap(b=>values.map(c=>[a,b,c]))),regimes=["familiar","mosaic","novel","coupled"],policies=["recall","compose","mutation","random","exhaustive"],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=x=>JSON.parse(JSON.stringify(x));
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function fixture(seed,world,split){
  const r=rng(seed*104729+({A:13,B:29,familiar:41,mosaic:53,novel:67,coupled:79}[world])*100003+({memory:11,probe:31,confirm:47,test:61}[split])*1000033);
  const axes={A:[8,0,8],B:[0,8,0],familiar:[8,0,8],mosaic:[8,8,0],novel:[4,8,4],coupled:[8,8,0]}[world],contexts=world==="coupled"?4:3;
  return Array.from({length:contexts*(split==="memory"?24:split==="test"?18:12)},(_,i)=>{
   const context=i%contexts,x=r(9),y=r(9),w=context===3?0:axes[context];
   const label=w===8?Math.floor(x/3):w===0?Math.floor(y/3):Math.floor((x+y)/6);
   return {context,x,y,label};
  });
 }
 function score(memory,queries,w){let correct=0,comparisons=0;const per=Array(Math.max(...queries.map(q=>q.context))+1).fill(0);
  for(const q of queries){let best=Infinity,pred=-1;const weight=q.context===3?(w.filter(n=>n===8).length%2===0?8:0):w[q.context];
   for(const m of memory){if(m.context!==q.context)continue;comparisons++;const d=weight*Math.abs(q.x-m.x)+(8-weight)*Math.abs(q.y-m.y);if(d<best){best=d;pred=m.label}}
   if(pred===q.label){correct++;per[q.context]++}}
  return {correct,per,comparisons};
 }
 // Closed interpreter: exactly one inherited same-index pocket per output.
 function compose(archive,ops){
  if(!Array.isArray(ops)||ops.length!==3)throw Error("operation budget");
  const out=[],seen=new Set();
  for(const op of ops){
   if(!op||Object.keys(op).sort().join(",")!=="op,pocket,source"||op.op!=="INHERIT"||!Number.isInteger(op.pocket)||op.pocket<0||op.pocket>2||seen.has(op.pocket)||!Number.isInteger(op.source)||!archive.some(n=>n.id===op.source))throw Error("invalid inheritance");
   const node=archive.find(n=>n.id===op.source);
   if(!values.includes(node.weights[op.pocket]))throw Error("invalid value");
   out[op.pocket]=node.weights[op.pocket];seen.add(op.pocket);
  }
  return out;
 }
 function trial(seed,regime,policy){
  if(!Number.isInteger(seed)||seed<1||seed>900||!regimes.includes(regime)||!policies.includes(policy))throw Error("trial");
  let calibrationCost=0,targetCost=0;
  const archive=[{id:0,parent:null,weights:baseline.slice(),world:"origin"}],calibration=[];
  const best=rows=>rows.reduce((a,b)=>!a||b.score.correct>a.score.correct?b:a,null);
  for(const world of ["A","B"]){
   const m=fixture(seed,world,"memory"),p=fixture(seed,world,"probe"),v=fixture(seed,world,"confirm");
   const measured=(q,w)=>{const s=score(m,q,w);calibrationCost+=s.comparisons;return s};
   const ranked=options.map(weights=>({weights,score:measured(p,weights)})),winner=best(ranked);
   const candidate=measured(v,winner.weights),ref=measured(v,baseline);
   const accepted=candidate.correct>=ref.correct+2&&candidate.per.every((n,i)=>n>=ref.per[i]);
   if(accepted&&!archive.some(n=>same(n.weights,winner.weights)))archive.push({id:archive.length,parent:0,weights:winner.weights.slice(),world});
   calibration.push({world,ranked,candidate,ref,accepted});
  }
  const m=fixture(seed,regime,"memory"),p=fixture(seed,regime,"probe"),v=fixture(seed,regime,"confirm"),q=fixture(seed,regime,"test");
  const measured=(query,w)=>{const s=score(m,query,w);targetCost+=s.comparisons;return s};
  const evaluated=archive.map(n=>({weights:n.weights.slice(),score:measured(p,n.weights),source:"archive",id:n.id}));
  const incumbent=best(evaluated),rankedArchive=evaluated.slice(),extra=[];
  const propose=(weights,source,ops=null)=>{
   if(evaluated.some(r=>same(r.weights,weights)))return;
   const row={weights:weights.slice(),score:measured(p,weights),source,ops};evaluated.push(row);extra.push(row);
  };
  // Per-pocket source ranking uses the already charged ancestor probes.
  const donors=[0,1,2].map(i=>rankedArchive.reduce((a,b)=>b.score.per[i]>a.score.per[i]?b:a).id);
  const instructions=mask=>[0,1,2].map(pocket=>({op:"INHERIT",pocket,source:mask.includes(pocket)?donors[pocket]:incumbent.id}));
  if(policy==="compose"){
   for(const mask of [[0,1,2],[0,1],[0,2],[1,2],[0],[1],[2]]){const ops=instructions(mask);propose(compose(archive,ops),"compose",ops);if(extra.length===3)break}
  }else if(policy==="mutation"){
   for(const i of [0,1,2]){const w=incumbent.weights.slice();w[i]=archive.find(n=>n.id===donors[i]).weights[i];propose(w,"mutation")}
  }
  // Matched extra probe budget for compose, mutation and random; fill unused slots with identical seeded random ordering.
  const r=rng(seed*971+331),order=options.slice();for(let i=order.length-1;i>0;i--){const j=r(i+1);[order[i],order[j]]=[order[j],order[i]]}
  if(["compose","mutation","random"].includes(policy)){for(const w of order){if(extra.length===3)break;propose(w,"random-fill")}}
  if(policy==="exhaustive")for(const w of options)propose(w,"exhaustive");
  const winner=best(evaluated),proposed=measured(v,winner.weights),ref=measured(v,baseline);
  const eligible=proposed.correct>=ref.correct+2&&proposed.per.every((n,i)=>n>=ref.per[i]);
  const shadow=eligible?winner.weights:baseline,heldout=measured(q,shadow),heldoutFixed=measured(q,baseline);
  const node=eligible&&!archive.some(n=>same(n.weights,shadow))?{id:archive.length,parent:incumbent.id,donors:winner.ops?winner.ops.map(o=>o.source):null,weights:shadow.slice()}:null;
  return {seed,regime,policy,archive,calibration,calibrationCost,targetCost,evaluated,extra,incumbent,winner,proposed,ref,eligible,shadow:shadow.slice(),node,heldout,heldoutFixed,active:baseline.slice(),authority:"NONE"};
 }
 function replay(t){if(!same(t,trial(t.seed,t.regime,t.policy)))throw Error("replay mismatch");return true}
 function report(seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed count");const rows=[];
  for(const regime of regimes)for(const policy of policies){
   let correct=0,total=0,ref=0,target=0,cal=0,novel=0,composed=0,attempted=0,below=0;
   for(let seed=1;seed<=seeds;seed++){const t=trial(seed,regime,policy);correct+=t.heldout.correct;ref+=t.heldoutFixed.correct;total+=regime==="coupled"?72:54;target+=t.targetCost;cal+=t.calibrationCost;novel+=Number(!!t.node);composed+=Number(!!t.node&&t.winner.source==="compose");attempted+=t.extra.filter(x=>x.source==="compose").length;below+=Number(t.heldout.correct<t.heldoutFixed.correct)}
   rows.push({regime,policy,accuracy:correct/total,fixedAccuracy:ref/total,meanTargetComparisons:target/seeds,meanCalibrationComparisons:cal/seeds,meanTotalComparisons:(target+cal)/seeds,novelAccepted:novel,composedAccepted:composed,composeProposals:attempted,belowFixed:below});
  }
  return {schema:"phi020-v1",status:"SIMULATED",authority:"NONE",seeds,rows};
 }
 function test(){
  let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++},deny=fn=>{try{fn();return false}catch{return true}};
  const a=[{id:0,weights:[8,0,8]},{id:1,weights:[0,8,0]}],ops=[0,1,2].map(pocket=>({op:"INHERIT",pocket,source:pocket===0?0:1}));
  assert(same(compose(a,ops),[8,8,0]),"novel composition");
  for(const bad of [[],[ops[0],ops[0],ops[2]],[{...ops[0],source:9},ops[1],ops[2]],[{...ops[0],op:"EXEC"},ops[1],ops[2]],[{...ops[0],authority:"ADMIN"},ops[1],ops[2]],[{...ops[0],pocket:3},ops[1],ops[2]]])assert(deny(()=>compose(a,bad)),"reject invalid instruction");
  for(const regime of regimes)for(const policy of policies)for(const seed of [1,7,19,90]){
   const t=trial(seed,regime,policy),n=regime==="coupled"?4:3;
   assert(replay(t),"replay");assert(same(t.active,baseline)&&t.authority==="NONE","authority");
   assert(t.archive.length<=3&&new Set(t.archive.map(x=>x.weights.join(","))).size===t.archive.length,"archive");
   assert(t.calibrationCost===2*29*36*24,"calibration cost");
   assert(t.extra.length===(policy==="recall"?0:policy==="exhaustive"?27-t.archive.length:3),"matched budget");
   assert(t.targetCost===(t.evaluated.length+2)*12*n*24+2*18*n*24,"target cost");
   assert(new Set(t.evaluated.map(x=>x.weights.join(","))).size===t.evaluated.length,"dedup");
   assert(t.evaluated.every(x=>options.some(w=>same(w,x.weights))),"finite options");
   assert(t.extra.filter(x=>x.source==="compose").every(x=>same(x.weights,compose(t.archive,x.ops))),"donor provenance");
   assert(t.eligible?t.proposed.correct>=t.ref.correct+2&&t.proposed.per.every((x,i)=>x>=t.ref.per[i]):same(t.shadow,baseline),"gate");
   assert(!t.node||t.node.parent<t.node.id&&!t.archive.some(n=>same(n.weights,t.node.weights)),"new lineage");
   const bad=copy(t);bad.active=[8,8,8];assert(deny(()=>replay(bad)),"tamper");
   const altered=copy(t);altered.heldout.correct++;assert(deny(()=>replay(altered)),"tamper score");
  }
  assert(same(report(2),report(2)),"determinism");assert(deny(()=>report(0))&&deny(()=>report(901)),"bounds");
  assert(report(10).rows.some(r=>r.composedAccepted>0),"composition exercised");
  return {status:"passed",checks};
 }
 return {report,test};
}
const engine=chamber();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/phi020-relational-evolution.mjs [test|report [seeds]]');
