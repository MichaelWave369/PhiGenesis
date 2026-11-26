// ΦGenesis Φ018 — adaptive resilience in a finite shadow experiment.
function chamber(){
 const baseline=[4,4],options=[0,4,8].flatMap(a=>[0,4,8].map(b=>[a,b])),regimes=["stationary","abrupt","recurrent","probe-noise"],policies=["fixed","frozen","periodic","triggered","always-search"],epochs=18;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=x=>JSON.parse(JSON.stringify(x));
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function axis(regime,epoch,c){return ((regime==="abrupt"&&epoch>=9)||(regime==="recurrent"&&epoch>=6&&epoch<12))?1-c:c}
 function fixture(seed,regime,epoch,split){
  const r=rng(seed*104729+(epoch+2)*1000003+({memory:13,probe:31,confirm:53,test:79}[split])*1000033);
  return Array.from({length:split==="memory"?54:split==="test"?36:18},(_,i)=>{const context=i%2,x=r(9),y=r(9);let label=Math.floor((axis(regime,epoch,context)?y:x)/3);if(regime==="probe-noise"&&split==="probe"&&epoch>=6&&epoch<12&&r(4)===0)label=(label+1+r(2))%3;return {context,x,y,label}});
 }
 function score(memory,queries,w){let correct=0,comparisons=0;const per=[0,0];for(const q of queries){let best=Infinity,pred=-1;for(const m of memory){if(m.context!==q.context)continue;comparisons++;const d=w[q.context]*Math.abs(q.x-m.x)+(8-w[q.context])*Math.abs(q.y-m.y);if(d<best){best=d;pred=m.label}}if(pred===q.label){correct++;per[q.context]++}}return {correct,per,comparisons}}
 function trial(seed,regime,policy){
  if(!Number.isInteger(seed)||seed<1||seed>900||!regimes.includes(regime)||!policies.includes(policy))throw Error("trial");
  let shadow=baseline.slice(),cost=0,searches=0,changes=0;const events=[];
  for(let epoch=-1;epoch<epochs;epoch++){
   const m=fixture(seed,regime,epoch,"memory"),p=fixture(seed,regime,epoch,"probe"),v=fixture(seed,regime,epoch,"confirm");
   const before=shadow.slice();let comparisons=0;
   const measured=(q,w)=>{const s=score(m,q,w);comparisons+=s.comparisons;return s};
   // All policies receive the same observations and pay for baseline/current monitoring.
   const current=measured(p,before),ref=measured(p,baseline);
   const alarm=current.correct<=ref.correct-2||current.correct<=12;
   const search=policy!=="fixed"&&(epoch===-1||policy==="always-search"||policy==="periodic"&&epoch%3===0||policy==="triggered"&&(alarm||epoch%6===0));
   let candidate=null,confirmation=null,eligible=false,ranked=[];
   if(search){
    searches++;
    ranked=options.map(weights=>({weights:weights.slice(),score:measured(p,weights)}));
    // Prefer existing configuration on ties, then stable enumeration.
    let winner=ranked[0];for(const x of ranked){if(x.score.correct>winner.score.correct||x.score.correct===winner.score.correct&&same(x.weights,before))winner=x}
    candidate=winner.weights;
    const proposed=measured(v,candidate),incumbent=measured(v,before),reference=measured(v,baseline);
    confirmation={proposed,incumbent,reference};
    eligible=!same(candidate,before)&&proposed.correct>=incumbent.correct+2&&proposed.per.every((n,i)=>n>=incumbent.per[i]&&n>=reference.per[i]);
    if(eligible)shadow=candidate.slice();
   }
   if(!same(before,shadow))changes++;
   // Held-out outcomes never enter the decision path.
   const heldout=epoch<0?null:measured(fixture(seed,regime,epoch,"test"),shadow),heldoutFixed=epoch<0?null:measured(fixture(seed,regime,epoch,"test"),baseline);
   cost+=comparisons;
   events.push({epoch,before,current,ref,alarm,search,ranked,candidate,confirmation,eligible,after:shadow.slice(),heldout,heldoutFixed,comparisons});
  }
  return {seed,regime,policy,events,cost,searches,changes,active:baseline.slice(),authority:"NONE"};
 }
 function replay(t){if(!same(t,trial(t.seed,t.regime,t.policy)))throw Error("replay mismatch");return true}
 function report(seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed count");
  const rows=[];
  for(const regime of regimes)for(const policy of policies){
   let correct=0,post=0,postTotal=0,cost=0,searches=0,changes=0,bad=0,first=0,firstTotal=0;
   const boundary=regime==="abrupt"?9:6;
   for(let seed=1;seed<=seeds;seed++){
    const t=trial(seed,regime,policy);cost+=t.cost;searches+=t.searches;changes+=t.changes;
    for(const e of t.events.slice(1)){correct+=e.heldout.correct;bad+=Number(e.heldout.correct<e.heldoutFixed.correct);if(e.epoch>=boundary){post+=e.heldout.correct;postTotal+=36}if(e.epoch===boundary){first+=e.heldout.correct;firstTotal+=36}}
   }
   rows.push({regime,policy,accuracy:correct/(seeds*epochs*36),postAccuracy:post/postTotal,boundaryAccuracy:first/firstTotal,belowFixedEpochs:bad,meanSearches:searches/seeds,meanChanges:changes/seeds,meanComparisons:cost/seeds});
  }
  return {schema:"phi018-v1",status:"SIMULATED",authority:"NONE",seeds,epochs,rows};
 }
 function test(){
  let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++},deny=fn=>{try{fn();return false}catch{return true}};
  for(const regime of regimes)for(const policy of policies)for(const seed of [1,7,19]){
   const t=trial(seed,regime,policy);assert(replay(t),"replay");assert(t.events.length===19&&same(t.active,baseline)&&t.authority==="NONE","boundary");
   assert(t.cost===t.events.reduce((n,e)=>n+e.comparisons,0),"cost");
   assert(t.searches===t.events.filter(e=>e.search).length,"search count");
   for(const e of t.events){
    assert(options.some(w=>same(w,e.after)),"allowlist");
    assert(e.ranked.length===(e.search?9:0),"search cap");
    assert(e.comparisons===972+(e.search?12*486:0)+(e.epoch<0?0:1944),"comparison accounting");
    assert(e.eligible?e.search&&!same(e.before,e.after)&&e.confirmation.proposed.correct>=e.confirmation.incumbent.correct+2&&e.confirmation.proposed.per.every((n,i)=>n>=e.confirmation.incumbent.per[i]&&n>=e.confirmation.reference.per[i]):same(e.before,e.after),"admission");
    assert(policy!=="fixed"||same(e.after,baseline),"fixed");
    assert(policy!=="frozen"||e.epoch===-1||!e.search,"frozen");
    assert(e.epoch<0?e.heldout===null:e.heldout.comparisons===972,"test");
   }
   const bad=copy(t);bad.events[1].after=[9,9];assert(deny(()=>replay(bad)),"tamper");
   const changed=copy(t);changed.events[1].heldout.correct++;assert(deny(()=>replay(changed)),"tamper outcome");
  }
  assert(same(report(2),report(2)),"determinism");
  assert(deny(()=>report(0))&&deny(()=>report(901)),"bounds");
  return {status:"passed",checks};
 }
 return {report,test};
}
const engine=chamber();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/phi018-adaptive-resilience.mjs [test|report [seeds]]');
