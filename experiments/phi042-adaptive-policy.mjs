// Bounded research-only selection using delayed probe feedback.
import * as native from './phi030-memory.mjs';
import * as prior from './phi042-context-crucible.mjs';
import * as temporal from './phi042-temporal-horizons.mjs';
import {pathToFileURL} from 'node:url';
function adaptive(){
 const arms=["recent","prior-fallback","fresh-vote"],policies=[...arms,"rotation","full-feedback","selected-feedback"],regimes=["stationary","recurrent","delayed","contradictory"],delays=[1,3],newest=(a,b)=>b.epoch-a.epoch||b.id-a.id;
 const phase=(r,e)=>r==="stationary"?0:Math.floor(e/6)%2;
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function fixture(seed,r,e,probe){const rand=rng(seed*104729+(e+1)*1000033+(probe?83:47)*1000003);return Array.from({length:probe?18:36},(_,i)=>{const context=i%3,x=rand(9),y=rand(9),axis=(context===1?1:0)^phase(r,e);return {context,x,y,label:Math.floor((axis?y:x)/3)}})}
 function select(mode,e,feedback){
  if(!["full-feedback","selected-feedback"].includes(mode)||!Number.isInteger(e)||e<0||e>=24||!Array.isArray(feedback)||feedback.length>72)throw Error("selector input");
  const seen=new Set();for(const f of feedback){
   if(!f||Object.keys(f).sort().join(",")!=="arm,available,correct,epoch"||!arms.includes(f.arm)||!Number.isInteger(f.epoch)||f.epoch<0||!Number.isInteger(f.available)||f.available<=f.epoch||f.available>e||!Number.isInteger(f.correct)||f.correct<0||f.correct>18||seen.has(f.epoch+":"+f.arm))throw Error("feedback boundary");
   seen.add(f.epoch+":"+f.arm);
  }
  const recent=feedback.filter(f=>f.epoch>=e-6);
  const stats=arms.map(arm=>{const rows=recent.filter(f=>f.arm===arm);return {arm,n:rows.length,sum:rows.reduce((s,f)=>s+f.correct,0)}});
  // Forced exploration every fourth epoch only in selected-arm policy.
  if(mode==="selected-feedback"&&e%4===0)return arms[Math.floor(e/4)%3];
  if(mode==="full-feedback"&&stats.some(s=>!s.n))return "recent";
  // One correct-answer pseudocount at the midpoint for sparse feedback;
  // deterministic ties prefer ordinary recent memory.
  let best=stats[0],value=(best.sum+9)/(best.n+1);
  for(const s of stats.slice(1)){const v=(s.sum+9)/(s.n+1);if(v>value+1){best=s;value=v}}
  return best.arm;
 }
 function trial(seed,regime,delay,env,old,h){
  let state=env.run(seed,regime,"recent",0);
  const stats=Object.fromEntries(policies.map(p=>[p,{correct:0,answered:0,comparisons:0,probeComparisons:0,scans:0,probeEvaluations:0,feedbackReceived:0,switches:0,choices:[0,0,0],earlyCorrect:0,earlyTotal:0}]));
  const queues={"full-feedback":[],"selected-feedback":[]},history={"full-feedback":[],"selected-feedback":[]},last={};
  for(let e=0;e<24;e++){
   // Choices are committed before generating the current probe/test fixture.
   const choices={recent:"recent","prior-fallback":"prior-fallback","fresh-vote":"fresh-vote",rotation:arms[e%3]};
   for(const mode of Object.keys(queues)){
    const arrived=queues[mode].filter(f=>f.available===e);queues[mode]=queues[mode].filter(f=>f.available>e);history[mode].push(...arrived);stats[mode].feedbackReceived+=arrived.length;
    choices[mode]=select(mode,e,history[mode]);
   }
   state=env.step(state);
   const rows=state.memory.map(m=>({id:m.id,epoch:m.epoch,context:m.context,x:m.x,y:m.y,label:m.label})).sort(newest);
   const est=h.estimate(rows,e,old.infer),test=fixture(seed,regime,e,false),probe=fixture(seed,regime,e,true);
   const evaluate=(arm,qs)=>{let correct=0,answered=0,cost=0;for(const q of qs){const v=h.predict(arm,rows.filter(m=>m.context===q.context),q,est);cost+=v.cost;if(v.label!==null){answered++;correct+=Number(v.label===q.label)}}return {correct,answered,cost}};
   const measured=Object.fromEntries(arms.map(a=>[a,evaluate(a,test)]));
   const n=state.events.at(-1);if(measured.recent.correct!==n.correct||measured.recent.answered!==n.answered||measured.recent.cost!==n.comparisons)throw Error("native drift");
   for(const p of policies){const t=stats[p],arm=choices[p],v=measured[arm];t.correct+=v.correct;t.answered+=v.answered;t.comparisons+=v.cost;t.choices[arms.indexOf(arm)]++;t.switches+=Number(last[p]!==undefined&&last[p]!==arm);last[p]=arm;
    // Shared per-epoch inference estimate: charge needed passes once,
    // including full-information shadow probing. Fixed recent needs none.
    t.scans+=rows.length*(p==="full-feedback"?2:arm==="fresh-vote"?2:arm==="prior-fallback"?1:0);
    if(regime!=="stationary"&&e>=6&&e%6<3){t.earlyCorrect+=v.correct;t.earlyTotal+=36}
    if(p in queues){const probes=p==="full-feedback"?arms:[arm];for(const a of probes){const score=evaluate(a,probe);t.probeComparisons+=score.cost;t.probeEvaluations+=18;queues[p].push({arm:a,epoch:e,available:e+delay,correct:score.correct})}}
   }
  }
  return stats;
 }
 function report(env,old,h,seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>90)throw Error("seeds");const rows=[];
  for(const regime of regimes)for(const delay of delays){const totals=Object.fromEntries(policies.map(p=>[p,{choices:[0,0,0]}])),pair=Object.fromEntries(policies.map(p=>[p,{wins:0,ties:0,losses:0,worst:0}]));
   for(let seed=1;seed<=seeds;seed++){const t=trial(seed,regime,delay,env,old,h);
    for(const p of policies){const s=totals[p];for(const [k,v] of Object.entries(t[p]))if(k==="choices")v.forEach((n,i)=>s.choices[i]+=n);else s[k]=(s[k]||0)+v;const delta=t[p].correct-t["prior-fallback"].correct;pair[p][delta>0?"wins":delta<0?"losses":"ties"]++;pair[p].worst=Math.min(pair[p].worst,delta/864)}
   }
   for(const p of policies){const s=totals[p];rows.push({regime,delay,policy:p,accuracy:s.correct/(seeds*864),coverage:s.answered/(seeds*864),early:s.earlyTotal?s.earlyCorrect/s.earlyTotal:null,meanTestComparisons:s.comparisons/seeds,meanProbeComparisons:s.probeComparisons/seeds,meanTotalComparisons:(s.comparisons+s.probeComparisons)/seeds,meanScans:s.scans/seeds,meanProbeEvaluations:s.probeEvaluations/seeds,meanFeedbackReceived:s.feedbackReceived/seeds,meanSwitches:s.switches/seeds,choices:s.choices,paired:pair[p]})}
  }return {schema:"phi042-adaptive-policy-v1",authority:"NONE",release:"BLOCKED",seeds,rows};
 }
 function test(env,old,h){
  let checks=0;const check=(v,m)=>{if(!v)throw Error(m);checks++},deny=f=>{try{f();return false}catch{return true}};
  const f={arm:"recent",epoch:0,available:1,correct:9};
  check(select("full-feedback",0,[])==="recent","bootstrap");check(deny(()=>select("full-feedback",0,[f])),"future receipt");check(deny(()=>select("full-feedback",1,[{...f,test:36}])),"extra field");check(deny(()=>select("full-feedback",1,[f,f])),"duplicate");check(deny(()=>select("full-feedback",1,[{...f,correct:19}])),"count");check(select("selected-feedback",4,[])==="prior-fallback","explore");
  check(select("full-feedback",2,[f,{...f,arm:"prior-fallback",correct:18},{...f,arm:"fresh-vote",correct:0}])==="prior-fallback","past feedback changes choice");
  for(const r of regimes)for(const d of delays){const t=trial(7,r,d,env,old,h),ref=h.trial(7,r,env,old);for(const a of arms){check(t[a].correct===ref[a].correct&&t[a].comparisons===ref[a].comparisons,"temporal baseline")}
   for(const p of policies){const v=t[p];check(v.correct<=v.answered&&v.answered<=864,"counts");check(v.choices.reduce((a,b)=>a+b,0)===24,"one choice");check(v.probeEvaluations===(p==="full-feedback"?1296:p==="selected-feedback"?432:0),"probe budget");check(v.feedbackReceived===(p==="full-feedback"?3*(24-d):p==="selected-feedback"?24-d:0),"delivery");check(v.scans<=24*144,"scan cap")}
  }
  check(JSON.stringify(report(env,old,h,2))===JSON.stringify(report(env,old,h,2)),"replay");return {status:"passed",checks};
 }
 return {select,trial,report,test};
}
export const {select,trial,report,test}=adaptive();
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(process.argv[2]==='test'?test(native,prior,temporal):report(native,prior,temporal,90),null,2));
