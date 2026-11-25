// ΦGenesis Absent Architect E1 — finite, synthetic rule discovery.
function experiment(){
  const ids=Array.from({length:9},(_,i)=>i), anchors=[0,1,3], holdout=ids.filter(i=>!anchors.includes(i)), costs=[0,.25,1,2];
  const mod=x=>((x%3)+3)%3;
  function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
  function transform(c,r,b){let x=c%3,y=Math.floor(c/3);for(let i=0;i<r;i++)[x,y]=[-y,x];return mod(x+b%3)+3*mod(y+Math.floor(b/3))}
  const family=Array.from({length:36},(_,i)=>({rotation:Math.floor(i/9),offset:i%9}));
  // Separate evaluator uses explicit rotation matrices.
  function oracle(c,r,b){const x=c%3,y=Math.floor(c/3),v=[[x,y],[-y,x],[-x,-y],[y,-x]][r];return mod(v[0]+b%3)+3*mod(v[1]+Math.floor(b/3))}
  function learn(samples){const matches=family.filter(h=>samples.every(s=>transform(s.c,h.rotation,h.offset)===s.target));return matches.length===1?matches[0]:null}
  function world(seed){const r=rng(seed);const order=ids.slice();for(let i=8;i>0;i--){const j=r(i+1);[order[i],order[j]]=[order[j],order[i]]}
    return {cohort:order.slice(0,3),roots:ids.map(root=>{const rotation=r(4),offset=r(9);return {root,training:anchors.map(c=>({c,target:oracle(c,rotation,offset)})),evaluation:Array.from({length:36},(_,i)=>{const c=holdout[i%6];return {c,structured:oracle(c,rotation,offset),scrambled:r(9),blind:r(9)}})}})}
  }
  function observe(training){return training.map(({c,target})=>{const scan=ids.map(i=>i===target?1:0);return {c,target:scan.indexOf(1)}})}
  function simulate(w,policy,regime){if(!["sealed","equal","unequal","matched_blind","oracle"].includes(policy)||!["structured","scrambled"].includes(regime))throw Error("unknown configuration");
    const residents=w.roots.map(root=>{const access=policy==="equal"||policy==="matched_blind"||(policy==="unequal"&&w.cohort.includes(root.root));const reads=access?27:0;const h=access?learn(observe(root.training)):null;
      const correct=root.evaluation.reduce((n,e)=>{const prediction=policy==="oracle"?e[regime]:h&&policy!=="matched_blind"?transform(e.c,h.rotation,h.offset):e.blind;return n+Number(prediction===e[regime])},0);
      const gross=3*correct;return {root:root.root,correct,gross,reads,net:costs.map(cost=>gross-cost*reads),resolved:!!h};});
    const mean=(a,f)=>a.reduce((s,x)=>s+f(x),0)/a.length;
    return {accuracy:mean(residents,x=>x.correct/36),gross:mean(residents,x=>x.gross),reads:mean(residents,x=>x.reads),net:costs.map((_,i)=>mean(residents,x=>x.net[i])),cohortGap:mean(residents.filter(x=>w.cohort.includes(x.root)),x=>x.gross)-mean(residents.filter(x=>!w.cohort.includes(x.root)),x=>x.gross),residents}}
  const policies=["sealed","equal","unequal","matched_blind","oracle"], regimes=["structured","scrambled"];
  function report(seeds=90){if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed budget");
    const trials=Array.from({length:seeds},(_,i)=>{const w=world(i+1);return {seed:i+1,cohort:w.cohort,regimes:Object.fromEntries(regimes.map(g=>[g,Object.fromEntries(policies.map(p=>[p,simulate(w,p,g)]))]))}});
    const summary=Object.fromEntries(regimes.map(g=>[g,Object.fromEntries(policies.map(p=>{const v=trials.map(t=>t.regimes[g][p]),avg=f=>v.reduce((s,x)=>s+f(x),0)/seeds;return [p,{accuracy:avg(x=>x.accuracy),gross:avg(x=>x.gross),reads:avg(x=>x.reads),net:costs.map((_,i)=>avg(x=>x.net[i])),cohortGap:avg(x=>x.cohortGap)}]}))]));
    return {schema:"absent-architect-e1-v1",status:"SIMULATED",seeds,costs,summary,trials}}
  function test(){let checks=0;const assert=(ok,m)=>{if(!ok)throw Error(m);checks++};
    for(const h of family){for(const c of ids)assert(transform(c,h.rotation,h.offset)===oracle(c,h.rotation,h.offset),"independent evaluator agreement");const found=learn(anchors.map(c=>({c,target:oracle(c,h.rotation,h.offset)})));assert(JSON.stringify(found)===JSON.stringify(h),"family identification");assert(learn([{c:0,target:h.offset}])===null,"ambiguity abstention")}
    const a=report(9);assert(JSON.stringify(a)===JSON.stringify(report(9)),"deterministic replay");
    for(const t of a.trials){const g=t.regimes.structured;assert(g.equal.accuracy===1,"structured generalization");assert(g.equal.reads===27&&g.unequal.reads===9&&g.sealed.reads===0,"observation accounting");assert(g.sealed.accuracy===g.matched_blind.accuracy,"matched blind");assert(g.oracle.accuracy===1&&t.regimes.scrambled.oracle.accuracy===1,"oracle");assert(g.equal.residents.every(x=>x.net.every((n,i)=>n===x.gross-costs[i]*x.reads)),"cost accounting");assert(g.unequal.residents.every(x=>x.reads===(t.cohort.includes(x.root)?27:0)),"access accounting")}
    assert(learn([{c:0,target:0},{c:1,target:0}])===null,"contradiction abstention");
    let denied=false;try{simulate(world(1),"root","structured")}catch{denied=true}assert(denied,"unknown access policy");return {checks,status:"passed"}}
  return {report,test}
}
const engine=experiment();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e1.mjs [test|report [seeds]]');
