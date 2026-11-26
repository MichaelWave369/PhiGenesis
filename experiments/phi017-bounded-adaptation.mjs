// ΦGenesis Φ017: bounded relational memory adaptation.
function chamber(){
 const regimes=["stationary","specialized","shifted"],policies=["fixed","flat","pocket"],baseline=[4,4],clone=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function fixture(seed,split,regime){
  const r=rng(seed*104729+({train:11,validation:29,test:47}[split])*1000003);
  const rows=(n)=>Array.from({length:n},(_,i)=>{const context=i%2,x=r(9),y=r(9),axis=regime==="stationary"?0:regime==="shifted"&&split==="test"?1-context:context;return {context,x,y,label:Math.floor((axis?y:x)/3)}});
  return {memory:rows(54),queries:rows(36)};
 }
 function apply(ops){
  if(!Array.isArray(ops)||ops.length!==2)throw Error("operation budget");
  const next=baseline.slice(),seen=new Set();
  for(const op of ops){
   if(!op||Object.keys(op).sort().join(",")!=="op,pocket,weight"||op.op!=="SET_WEIGHT"||![0,1].includes(op.pocket)||seen.has(op.pocket)||!Number.isInteger(op.weight)||op.weight<0||op.weight>8)throw Error("invalid transform");
   seen.add(op.pocket);next[op.pocket]=op.weight;
  }
  return next;
 }
 const patch=weights=>weights.map((weight,pocket)=>({op:"SET_WEIGHT",pocket,weight}));
 function candidates(policy){
  if(policy==="fixed")return [baseline.slice()];
  if(policy==="flat")return Array.from({length:9},(_,w)=>[w,w]);
  if(policy==="pocket")return [0,4,8].flatMap(a=>[0,4,8].map(b=>[a,b]));
  throw Error("policy");
 }
 function score(f,weights){
  let correct=0,comparisons=0;const per=[0,0];
  for(const q of f.queries){let best=Infinity,pred=-1;const w=weights[q.context];
   for(const m of f.memory){if(m.context!==q.context)continue;comparisons++;const d=w*Math.abs(q.x-m.x)+(8-w)*Math.abs(q.y-m.y);if(d<best){best=d;pred=m.label}}
   if(pred===q.label){correct++;per[q.context]++}
  }
  return {correct,total:f.queries.length,comparisons,per};
 }
 function trial(seed,regime,policy){
  if(!Number.isInteger(seed)||seed<1||seed>900||!regimes.includes(regime))throw Error("fixture");
  const train=fixture(seed,"train",regime),val=fixture(seed,"validation",regime),test=fixture(seed,"test",regime);
  const evaluated=candidates(policy).map(w=>{const ops=patch(w),weights=apply(ops);return {ops,weights,training:score(train,weights)}});
  let selected=0;for(let i=1;i<evaluated.length;i++)if(evaluated[i].training.correct>evaluated[selected].training.correct)selected=i;
  const candidate=evaluated[selected].weights,reference=score(val,baseline),validation=score(val,candidate);
  // Fixed reference has no promotion request. Gate is independent of training.
  const eligible=policy!=="fixed"&&validation.correct>=reference.correct+2&&validation.per.every((n,i)=>n>=reference.per[i])&&validation.comparisons<=reference.comparisons;
  // Evaluate shadow configuration only; deployed state never changes.
  const shadow=eligible?candidate:baseline,heldout=score(test,shadow),testBaseline=score(test,baseline);
  const cost=evaluated.reduce((n,x)=>n+x.training.comparisons,0)+reference.comparisons+validation.comparisons+heldout.comparisons+testBaseline.comparisons;
  return {seed,regime,policy,original:baseline.slice(),evaluated,selected,reference,validation,eligible,shadow:shadow.slice(),heldout,testBaseline,cost,authority:"NONE",active:baseline.slice()};
 }
 function replay(trace){if(!same(trace,trial(trace.seed,trace.regime,trace.policy)))throw Error("replay mismatch");return true}
 function report(seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seeds");
  const rows=[];
  for(const regime of regimes)for(const policy of policies){
   let correct=0,reference=0,total=0,eligible=0,cost=0,regressions=0;
   for(let seed=1;seed<=seeds;seed++){const t=trial(seed,regime,policy);correct+=t.heldout.correct;reference+=t.testBaseline.correct;total+=t.heldout.total;eligible+=Number(t.eligible);cost+=t.cost;regressions+=Number(t.heldout.correct<t.testBaseline.correct)}
   rows.push({regime,policy,accuracy:correct/total,baselineAccuracy:reference/total,eligible,regressions,meanComparisons:cost/seeds});
  }
  return {schema:"phi017-v1",status:"SIMULATED",authority:"NONE",seeds,rows};
 }
 function test(){
  let checks=0;const assert=(ok,m)=>{if(!ok)throw Error(m);checks++};const deny=fn=>{try{fn();return false}catch{return true}};
  assert(same(apply(patch([8,0])),[8,0]),"valid patch");
  for(const invalid of [[],[{op:"SET_WEIGHT",pocket:0,weight:9},patch([4,4])[1]],[{...patch([4,4])[0],authority:"ADMIN"},patch([4,4])[1]],[patch([4,4])[0],patch([4,4])[0]],[{op:"REWRITE_EVALUATOR",pocket:0,weight:4},patch([4,4])[1]],[{op:"SET_WEIGHT",pocket:2,weight:4},patch([4,4])[1]],[{op:"SET_WEIGHT",pocket:0,weight:NaN},patch([4,4])[1]]])assert(deny(()=>apply(invalid)),"reject transform");
  for(const regime of regimes)for(const policy of policies)for(const seed of [1,7,19,90]){
   const t=trial(seed,regime,policy);assert(replay(t),"replay");assert(same(t.active,baseline)&&t.authority==="NONE","no promotion");
   assert(t.evaluated.length===(policy==="fixed"?1:9),"budget");
   assert(t.evaluated.every(x=>x.training.comparisons===972),"comparison count");
   assert(t.heldout.total===36&&t.cost===(t.evaluated.length+4)*972,"full costs");
   assert(t.eligible? t.validation.correct>=t.reference.correct+2&&t.validation.per.every((n,i)=>n>=t.reference.per[i]):same(t.shadow,baseline),"gate");
   const bad=clone(t);bad.active=[8,0];assert(deny(()=>replay(bad)),"tamper");
   const changed=clone(t);changed.evaluated[0].training.correct++;assert(deny(()=>replay(changed)),"tamper evidence");
   assert(!same(fixture(seed,"train",regime),fixture(seed,"test",regime)),"split fixtures");
  }
  assert(same(report(3),report(3)),"determinism");
  assert(deny(()=>report(0))&&deny(()=>report(901)),"seed bounds");
  return {status:"passed",checks};
 }
 return {report,test};
}
const engine=chamber();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/phi017-bounded-adaptation.mjs [test|report [seeds]]');
