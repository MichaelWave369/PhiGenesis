// Research-only selective attention; no authority or runtime changes.
import * as native from './phi030-memory.mjs';
import * as prior from './phi042-context-crucible.mjs';
import * as temporal from './phi042-temporal-horizons.mjs';
import * as adaptive from './phi042-adaptive-policy.mjs';
import {pathToFileURL} from 'node:url';
function attention(){
 const arms=["recent","prior-fallback","fresh-vote"],modes=["periodic-audit","score-trigger","context-trigger"],baselines=[...arms,"rotation","full-feedback","selected-feedback"],regimes=["stationary","recurrent","delayed","contradictory"],delays=[1,3],CAP=24,newest=(a,b)=>b.epoch-a.epoch||b.id-a.id;
 const phase=(r,e)=>r==="stationary"?0:Math.floor(e/6)%2;
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function fixture(seed,r,e,probe){const rand=rng(seed*104729+(e+1)*1000033+(probe?83:47)*1000003);return Array.from({length:probe?18:36},(_,i)=>{const context=i%3,x=rand(9),y=rand(9),axis=(context===1?1:0)^phase(r,e);return {context,x,y,label:Math.floor((axis?y:x)/3)}})}
 function review(incumbent,epoch,receipt){
  if(!arms.includes(incumbent)||!Number.isInteger(epoch)||epoch<0||epoch>=24||!receipt||Object.keys(receipt).sort().join(",")!=="available,epoch,scores"||!Number.isInteger(receipt.epoch)||receipt.epoch<0||!Number.isInteger(receipt.available)||receipt.available<=receipt.epoch||receipt.available>epoch||!Array.isArray(receipt.scores)||receipt.scores.length!==3||receipt.scores.some(v=>!Number.isInteger(v)||v<0||v>18))throw Error("review receipt");
  if(epoch-receipt.epoch>6)return incumbent;
  let best=arms.indexOf(incumbent);for(let i=0;i<3;i++)if(receipt.scores[i]>receipt.scores[best])best=i;
  return receipt.scores[best]>=receipt.scores[arms.indexOf(incumbent)]+2?arms[best]:incumbent;
 }
 function plan(mode,e,delay,spent,pending,alarm){
  if(!modes.includes(mode)||!Number.isInteger(e)||e<0||e>=24||!delays.includes(delay)||!Number.isInteger(spent)||spent<0||spent>CAP||typeof pending!=="boolean"||typeof alarm!=="boolean")throw Error("attention input");
  if(e+delay>=24)return "none";
  const tick=e%3===1;
  if(!pending&&spent+3<=CAP&&(mode==="periodic-audit"?tick:alarm))return "audit";
  if(mode!=="periodic-audit"&&tick&&spent<CAP)return "monitor";
  return "none";
 }
 function trial(seed,regime,delay,env,old,h,prev){
  const baseline=prev.trial(seed,regime,delay,env,old,h);
  let state=env.run(seed,regime,"recent",0);
  const stats=Object.fromEntries(modes.map(p=>[p,{correct:0,answered:0,comparisons:0,probeComparisons:0,scans:0,probeEvaluations:0,feedbackReceived:0,switches:0,choices:[0,0,0],earlyCorrect:0,earlyTotal:0,audits:0,monitors:0,alarms:0}]));
  const control=Object.fromEntries(modes.map(p=>[p,{arm:"prior-fallback",queue:[],spent:0,lastScore:null,lastTag:null,alarm:false}]));
  for(let e=0;e<24;e++){
   state=env.step(state);
   const rows=state.memory.map(m=>({id:m.id,epoch:m.epoch,context:m.context,x:m.x,y:m.y,label:m.label})).sort(newest),est=h.estimate(rows,e,old.infer);
   const actions={};
   // No current query labels or test metrics enter control. All plans are
   // committed before fixture creation. Context signal uses delivered rows.
   for(const p of modes){
    const c=control[p],t=stats[p],arrived=c.queue.filter(f=>f.available===e);c.queue=c.queue.filter(f=>f.available>e);
    for(const f of arrived){t.feedbackReceived+=f.kind==="audit"?3:1;
     if(f.kind==="audit"){const next=review(c.arm,e,{epoch:f.epoch,available:f.available,scores:f.scores});t.switches+=Number(next!==c.arm);c.arm=next;c.lastScore=null;}
     else if(f.arm===c.arm){if(f.correct<=9||(c.lastScore!==null&&c.lastScore-f.correct>=4))c.alarm=true;c.lastScore=f.correct}
    }
    if(p==="context-trigger"&&est.old!==null){if(c.lastTag!==null&&c.lastTag!==est.old)c.alarm=true;c.lastTag=est.old}
    t.alarms+=Number(c.alarm);
    const action=plan(p,e,delay,c.spent,c.queue.some(f=>f.kind==="audit"),c.alarm);
    if(action==="audit"){c.alarm=false;c.spent+=3;t.audits++}else if(action==="monitor"){c.spent++;t.monitors++}
    actions[p]={arm:c.arm,action};
   }
   const test=fixture(seed,regime,e,false),probe=fixture(seed,regime,e,true);
   const evaluate=(arm,qs)=>{let correct=0,answered=0,cost=0;for(const q of qs){const v=h.predict(arm,rows.filter(m=>m.context===q.context),q,est);cost+=v.cost;if(v.label!==null){answered++;correct+=Number(v.label===q.label)}}return {correct,answered,cost}};
   for(const p of modes){const t=stats[p],c=control[p],{arm,action}=actions[p],v=evaluate(arm,test);
    t.correct+=v.correct;t.answered+=v.answered;t.comparisons+=v.cost;t.choices[arms.indexOf(arm)]++;
    t.scans+=rows.length*(action==="audit"||arm==="fresh-vote"?2:arm==="prior-fallback"||p==="context-trigger"?1:0);
    if(regime!=="stationary"&&e>=6&&e%6<3){t.earlyCorrect+=v.correct;t.earlyTotal+=36}
    if(action==="audit"){const scores=arms.map(a=>evaluate(a,probe));t.probeComparisons+=scores.reduce((n,x)=>n+x.cost,0);t.probeEvaluations+=54;c.queue.push({kind:"audit",epoch:e,available:e+delay,scores:scores.map(x=>x.correct)})}
    if(action==="monitor"){const score=evaluate(arm,probe);t.probeComparisons+=score.cost;t.probeEvaluations+=18;c.queue.push({kind:"monitor",arm,epoch:e,available:e+delay,correct:score.correct})}
   }
  }
  return {...baseline,...stats};
 }
 function report(env,old,h,prev,seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>90)throw Error("seeds");const rows=[],policies=[...baselines,...modes];
  for(const regime of regimes)for(const delay of delays){
   const sums=Object.fromEntries(policies.map(p=>[p,{}])),pairs=Object.fromEntries(policies.map(p=>[p,{wins:0,ties:0,losses:0,worst:0}]));
   for(let seed=1;seed<=seeds;seed++){const t=trial(seed,regime,delay,env,old,h,prev);for(const p of policies){for(const [k,v]of Object.entries(t[p]))if(typeof v==="number")sums[p][k]=(sums[p][k]||0)+v;const delta=t[p].correct-t["prior-fallback"].correct;pairs[p][delta>0?"wins":delta<0?"losses":"ties"]++;pairs[p].worst=Math.min(pairs[p].worst,delta/864)}}
   for(const p of policies){const s=sums[p];rows.push({regime,delay,policy:p,accuracy:s.correct/(seeds*864),coverage:s.answered/(seeds*864),early:s.earlyTotal?s.earlyCorrect/s.earlyTotal:null,meanComparisons:(s.comparisons+s.probeComparisons)/seeds,meanProbeComparisons:s.probeComparisons/seeds,meanScans:s.scans/seeds,meanProbeEvaluations:s.probeEvaluations/seeds,meanAudits:(s.audits||0)/seeds,meanMonitors:(s.monitors||0)/seeds,meanSwitches:s.switches/seeds,paired:pairs[p]})}
  }return {schema:"phi042-selective-attention-v1",authority:"NONE",release:"BLOCKED",seeds,probeBatchCap:CAP,rows};
 }
 function test(env,old,h,prev){
  let checks=0;const check=(v,m)=>{if(!v)throw Error(m);checks++},deny=f=>{try{f();return false}catch{return true}};
  const f={epoch:1,available:2,scores:[18,9,0]};
  check(review("prior-fallback",2,f)==="recent","paired gain");check(review("prior-fallback",8,f)==="prior-fallback","stale");check(review("prior-fallback",2,{...f,scores:[10,9,0]})==="prior-fallback","margin");check(deny(()=>review("recent",1,f)),"future");check(deny(()=>review("recent",2,{...f,truth:0})),"extra");
  check(plan("score-trigger",4,1,23,false,true)==="monitor","budget");check(plan("score-trigger",5,1,22,false,true)==="none","reserve");check(plan("score-trigger",5,1,21,false,true)==="audit","audit");check(plan("context-trigger",5,1,0,true,true)==="none","pending");check(plan("periodic-audit",22,3,0,false,false)==="none","late");
  for(const r of regimes)for(const d of delays){const t=trial(7,r,d,env,old,h,prev);for(const p of modes){const v=t[p];check(v.correct<=v.answered&&v.answered<=864,"counts");check(v.choices.reduce((a,b)=>a+b,0)===24,"choice");check(v.probeEvaluations===18*(3*v.audits+v.monitors)&&v.probeEvaluations<=432,"cap");check(v.feedbackReceived===3*v.audits+v.monitors,"delivered");check(v.scans<=24*144,"scans");check(v.switches<=v.audits,"switches")}}
  check(JSON.stringify(report(env,old,h,prev,2))===JSON.stringify(report(env,old,h,prev,2)),"replay");return {status:"passed",checks};
 }
 return {plan,review,trial,report,test};
}
export const {plan,review,trial,report,test}=attention();
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(process.argv[2]==='test'?test(native,prior,temporal,adaptive):report(native,prior,temporal,adaptive,90),null,2));
