// ΦGenesis Φ019 — bounded computational lineage and ancestral recall.
function chamber(){
 const baseline=[4,4],options=[0,4,8].flatMap(a=>[0,4,8].map(b=>[a,b])),regimes=["stationary","recurrent","offset-recurrent","novel","probe-noise"],policies=["fixed","triggered","recall-first","recall-only"],epochs=24,cap=3;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=x=>JSON.parse(JSON.stringify(x));
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function axis(regime,e,c){
  if(regime==="recurrent"&&((e>=6&&e<12)||e>=18))return 1-c;
  if(regime==="offset-recurrent"&&((e>=5&&e<13)||e>=19))return 1-c;
  if(regime==="novel"&&e>=12)return 0;
  if(regime==="novel"&&e>=6)return 1-c;
  return c;
 }
 function fixture(seed,regime,e,split){
  const r=rng(seed*104729+(e+2)*1000003+({memory:13,probe:31,confirm:53,test:79}[split])*1000033);
  return Array.from({length:split==="memory"?54:split==="test"?36:18},(_,i)=>{const context=i%2,x=r(9),y=r(9);let label=Math.floor((axis(regime,e,context)?y:x)/3);if(regime==="probe-noise"&&split==="probe"&&e>=6&&e<18&&r(4)===0)label=(label+1+r(2))%3;return {context,x,y,label}});
 }
 function score(memory,queries,w){let correct=0,comparisons=0;const per=[0,0];for(const q of queries){let best=Infinity,pred=-1;for(const m of memory){if(m.context!==q.context)continue;comparisons++;const d=w[q.context]*Math.abs(q.x-m.x)+(8-w[q.context])*Math.abs(q.y-m.y);if(d<best){best=d;pred=m.label}}if(pred===q.label){correct++;per[q.context]++}}return {correct,per,comparisons}}
 function trial(seed,regime,policy){
  if(!Number.isInteger(seed)||seed<1||seed>900||!regimes.includes(regime)||!policies.includes(policy))throw Error("trial");
  const nodes=[{id:0,parent:null,recall:null,epoch:-2,weights:baseline.slice()}];let activeId=0,archive=[0],cost=0;const events=[];
  for(let e=-1;e<epochs;e++){
   const m=fixture(seed,regime,e,"memory"),p=fixture(seed,regime,e,"probe"),v=fixture(seed,regime,e,"confirm");
   const parent=activeId,before=nodes[parent].weights.slice(),archiveBefore=archive.slice(),cache=new Map();let comparisons=0;
   const measured=(q,w)=>{const s=score(m,q,w);comparisons+=s.comparisons;return s};
   const probe=w=>{const key=w.join(",");if(!cache.has(key))cache.set(key,measured(p,w));return cache.get(key)};
   const incumbent=probe(before),reference=probe(baseline),alarm=incumbent.correct<=reference.correct-2||incumbent.correct<=12;
   const search=policy!=="fixed"&&(e===-1||alarm||e%6===0);
   let source="none",candidate=null,recall=null,confirmation=null,eligible=false,rankedArchive=[],rankedFull=[];
   function best(rows){return rows.reduce((a,b)=>!a||b.score.correct>a.score.correct||b.score.correct===a.score.correct&&same(b.weights,before)?b:a,null)}
   if(search){
    if(policy.startsWith("recall")&&e!==-1){
     rankedArchive=archive.filter(id=>!same(nodes[id].weights,before)).map(id=>({id,weights:nodes[id].weights.slice(),score:probe(nodes[id].weights)}));
     const winner=best(rankedArchive.filter(x=>x.score.correct>=incumbent.correct+2&&x.score.per.every((n,i)=>n>=incumbent.per[i])));
     if(winner){candidate=winner.weights;recall=winner.id;source="recall"}
    }
    if(!candidate&&(policy!=="recall-only"||e===-1)){
     rankedFull=options.map(weights=>({weights:weights.slice(),score:probe(weights)}));
     candidate=best(rankedFull).weights;source="full";
    }
    if(candidate&&!same(candidate,before)){
     const proposed=measured(v,candidate),old=measured(v,before),fixed=same(before,baseline)?old:same(candidate,baseline)?proposed:measured(v,baseline);
     confirmation={proposed,old,fixed};
     eligible=proposed.correct>=old.correct+2&&proposed.per.every((n,i)=>n>=old.per[i]&&n>=fixed.per[i]);
     if(eligible){
      activeId=nodes.length;nodes.push({id:activeId,parent,recall,epoch:e,weights:candidate.slice()});
      archive=[activeId,...archive.filter(id=>!same(nodes[id].weights,candidate))].slice(0,cap);
     }
    }
   }
   const after=nodes[activeId].weights.slice();
   const q=e<0?null:fixture(seed,regime,e,"test"),heldout=q?measured(q,after):null,heldoutFixed=q?measured(q,baseline):null;
   cost+=comparisons;events.push({epoch:e,parent,activeId,before,after,archiveBefore,archive:archive.slice(),incumbent,reference,alarm,search,source,candidate,recall,rankedArchive,rankedFull,confirmation,eligible,heldout,heldoutFixed,comparisons,uniqueProbeEvaluations:cache.size});
  }
  return {seed,regime,policy,nodes,archive,events,cost,active:baseline.slice(),authority:"NONE"};
 }
 function replay(t){if(!same(t,trial(t.seed,t.regime,t.policy)))throw Error("replay mismatch");return true}
 function report(seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed count");
  const rows=[];
  for(const regime of regimes)for(const policy of policies){
   let correct=0,cost=0,full=0,recalls=0,acceptedRecalls=0,changes=0,bad=0,returnCorrect=0,returnTotal=0,evictions=0;
   for(let seed=1;seed<=seeds;seed++){
    const t=trial(seed,regime,policy);cost+=t.cost;changes+=t.nodes.length-1;
    for(const e of t.events){
     full+=Number(e.source==="full");recalls+=Number(e.source==="recall");acceptedRecalls+=Number(e.source==="recall"&&e.eligible);
     evictions+=e.archiveBefore.filter(id=>!e.archive.includes(id)&&!e.archive.some(j=>same(t.nodes[j].weights,t.nodes[id].weights))).length;
     if(e.epoch<0)continue;correct+=e.heldout.correct;bad+=Number(e.heldout.correct<e.heldoutFixed.correct);
     if((regime==="recurrent"&&e.epoch>=12)||(regime==="offset-recurrent"&&e.epoch>=13)){returnCorrect+=e.heldout.correct;returnTotal+=36}
    }
   }
   rows.push({regime,policy,accuracy:correct/(seeds*epochs*36),returnAccuracy:returnTotal?returnCorrect/returnTotal:null,meanComparisons:cost/seeds,meanFull:full/seeds,meanRecalls:recalls/seeds,acceptedRecalls,meanChanges:changes/seeds,evictions,belowFixedEpochs:bad});
  }
  return {schema:"phi019-v1",status:"SIMULATED",authority:"NONE",seeds,epochs,archiveCapacity:cap,rows};
 }
 function test(){
  let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++},deny=fn=>{try{fn();return false}catch{return true}};
  for(const regime of regimes)for(const policy of policies)for(const seed of [1,7,19]){
   const t=trial(seed,regime,policy);assert(replay(t),"replay");assert(same(t.active,baseline)&&t.authority==="NONE","authority");
   assert(t.cost===t.events.reduce((n,e)=>n+e.comparisons,0),"cost");
   for(const n of t.nodes.slice(1)){assert(n.parent<n.id&&t.nodes[n.parent].epoch<n.epoch,"parent");assert(n.recall===null||n.recall<n.id&&same(n.weights,t.nodes[n.recall].weights),"recall ancestry")}
   for(const e of t.events){
    assert(e.archive.length<=cap&&new Set(e.archive.map(id=>t.nodes[id].weights.join(","))).size===e.archive.length,"bounded dedup archive");
    assert(e.archive[0]===e.activeId&&same(t.nodes[e.activeId].weights,e.after),"current node");
    assert(options.some(w=>same(w,e.after)),"allowlist");
    assert(e.uniqueProbeEvaluations<=9&&e.comparisons===e.uniqueProbeEvaluations*486+(e.confirmation?(same(e.before,baseline)||same(e.candidate,baseline)?2:3)*486:0)+(e.epoch<0?0:1944),"comparison accounting");
    assert(e.eligible?e.confirmation.proposed.correct>=e.confirmation.old.correct+2&&e.confirmation.proposed.per.every((n,i)=>n>=e.confirmation.old.per[i]&&n>=e.confirmation.fixed.per[i])&&e.activeId!==e.parent:e.activeId===e.parent&&same(e.archive,e.archiveBefore),"gate");
    assert(e.source!=="recall"||e.archiveBefore.includes(e.recall)&&same(e.candidate,t.nodes[e.recall].weights)&&e.rankedFull.length===0,"recall provenance");
    assert(policy!=="recall-only"||e.epoch===-1||e.source!=="full","ablation");
    assert(policy!=="fixed"||same(e.after,baseline),"fixed");
   }
   const bad=copy(t);bad.events[1].archive=[999];assert(deny(()=>replay(bad)),"archive tamper");
   const changed=copy(t);changed.nodes[0].weights=[8,8];assert(deny(()=>replay(changed)),"ancestor tamper");
  }
  const r=report(3);assert(same(r,report(3)),"determinism");assert(deny(()=>report(0))&&deny(()=>report(901)),"bounds");
  assert(report(10).rows.some(r=>r.acceptedRecalls>0),"recall exercised");
  return {status:"passed",checks};
 }
 return {report,test};
}
const engine=chamber();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/phi019-ancestral-recall.mjs [test|report [seeds]]');
