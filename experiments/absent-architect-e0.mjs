// ΦGenesis: Absent Architect E0. Dependency-free synthetic fixture.
function experiment(){
  const policies=["sealed","equal","unequal"];
  function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
  function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=r(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
  function makeWorld(seed,flat=false){const r=rng(seed);const privileged=shuffle(Array.from({length:9},(_,i)=>i),r).slice(0,3).sort((a,b)=>a-b);
    const rounds=Array.from({length:36},()=>({capacity:Array.from({length:81},()=>flat?3:r(9)),order:shuffle(Array.from({length:9},(_,i)=>i),r),choices:Array.from({length:9},()=>{const root=r(9);return shuffle(Array.from({length:9},(_,i)=>root*9+i),r).slice(0,3)})}));
    return {privileged,rounds}}
  function gini(a){let sum=a.reduce((x,y)=>x+y,0);return sum? a.reduce((s,x)=>s+a.reduce((t,y)=>t+Math.abs(x-y),0),0)/(2*a.length*sum):0}
  function simulate(world,policy){if(!policies.includes(policy))throw Error("unknown policy");
    let balances=Array(9).fill(0),available=0,remaining=0,observations=0;const actions=Array(9).fill(0);
    for(const round of world.rounds){const left=round.capacity.slice();available+=left.reduce((a,b)=>a+b,0);
      for(const id of round.order){const allowed=policy==="equal"||(policy==="unequal"&&world.privileged.includes(id));const candidates=round.choices[id];const visible=allowed?candidates:[candidates[0]];observations+=visible.length;
        const chosen=visible.reduce((best,c)=>round.capacity[c]>round.capacity[best]?c:best,visible[0]);const take=Math.min(3,left[chosen]);left[chosen]-=take;balances[id]+=take;actions[id]++;}
      if(left.some(x=>x<0))throw Error("negative resource");remaining+=left.reduce((a,b)=>a+b,0);}
    const collected=balances.reduce((a,b)=>a+b,0);if(collected+remaining!==available||actions.some(x=>x!==36))throw Error("conservation or action budget");
    const cohort=world.privileged;const mean=ids=>ids.reduce((s,id)=>s+balances[id],0)/ids.length;
    return {balances,collected,available,remaining,observations,gini:gini(balances),cohortGap:mean(cohort)-mean(Array.from({length:9},(_,i)=>i).filter(i=>!cohort.includes(i)))};
  }
  function report(seeds=90){if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed budget");
    const trials=Array.from({length:seeds},(_,i)=>{const seed=i+1;const w=makeWorld(seed),flat=makeWorld(seed,true);return {seed,privileged:w.privileged,worlds:Object.fromEntries(policies.map(p=>[p,simulate(w,p)])),flat:Object.fromEntries(policies.map(p=>[p,simulate(flat,p)]))}});
    const metrics=["gini","cohortGap","collected","observations"];
    const aggregate=Object.fromEntries(policies.map(p=>[p,Object.fromEntries(metrics.map(m=>[m,trials.reduce((s,t)=>s+t.worlds[p][m],0)/seeds]))]));
    return {schema:"phi-genesis-absent-architect-e0-v1",status:"SIMULATED",seeds,aggregate,trials};
  }
  function test(){const a=report(9),b=report(9);let checks=0;function assert(ok,msg){if(!ok)throw Error(msg);checks++}
    assert(JSON.stringify(a)===JSON.stringify(b),"replay");
    for(const t of a.trials){assert(t.privileged.length===3&&new Set(t.privileged).size===3,"cohort");assert(policies.every(p=>t.worlds[p].available===t.worlds.sealed.available),"matched resource schedule");assert(JSON.stringify(t.flat.sealed.balances)===JSON.stringify(t.flat.equal.balances)&&JSON.stringify(t.flat.equal.balances)===JSON.stringify(t.flat.unequal.balances),"flat signal negative control");assert(t.worlds.sealed.observations===324&&t.worlds.equal.observations===972&&t.worlds.unequal.observations===540,"observation budget");for(const p of policies){const w=t.worlds[p];assert(w.collected+w.remaining===w.available&&w.balances.every(x=>x>=0&&x<=108),"resource and harvest bound")}}
    const world=makeWorld(7),before=JSON.stringify(world);simulate(world,"unequal");assert(JSON.stringify(world)===before,"no mutation of world fixtures");let refused=false;try{simulate(world,"root")}catch{refused=true}assert(refused,"unknown policy denied");return {checks,status:"passed"}}
  return {report,test};
}
const engine = experiment();
const mode=process.argv[2] ?? 'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e0.mjs [test|report [seeds]]');
