// Internal context recognition experiment using unchanged Phi030 transport and evaluator fixture.
import * as native from './phi030-memory.mjs';
function crucible(){
 const regimes=["stationary","recurrent","delayed","contradictory"],policies=["recent","oracle","noisy","delayed-tag","inferred","inferred-fallback"],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const newest=(a,b)=>b.epoch-a.epoch||b.id-a.id;
 const phase=(r,e)=>r==="stationary"?0:Math.floor(e/6)%2;
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 // Evaluator only: exact Phi030 test generator, never passed to infer().
 function queries(seed,r,e){const rand=rng(seed*104729+(e+1)*1000033+47*1000003);return Array.from({length:36},(_,i)=>{const context=i%3,x=rand(9),y=rand(9),axis=(context===1?1:0)^phase(r,e);return {context,x,y,label:Math.floor((axis?y:x)/3)}})}
 function clean(m){return {id:m.id,epoch:m.epoch,context:m.context,x:m.x,y:m.y,label:m.label}}
 function infer(rows){
  if(rows.length>72||rows.some(m=>Object.keys(m).sort().join(",")!=="context,epoch,id,label,x,y"))throw Error("inference input");
  const groups=new Map();let latest=-1;
  for(const m of rows){
   const a=Math.floor((m.context===1?m.y:m.x)/3),b=Math.floor((m.context===1?m.x:m.y)/3);
   const g=groups.get(m.epoch)||[0,0];if(a!==b){if(m.label===a)g[0]++;else if(m.label===b)g[1]++}groups.set(m.epoch,g);latest=Math.max(latest,m.epoch);
  }
  const decide=([a,b])=>a+b>=3&&Math.abs(a-b)>=2?Number(b>a):null;
  const recent=[0,0],tags=new Map();for(const [e,v] of groups){tags.set(e,decide(v));if(e>=latest-1){recent[0]+=v[0];recent[1]+=v[1]}}
  return {tag:decide(recent),tags,scans:rows.length,latest};
 }
 function trial(seed,regime,env){
  let s=env.run(seed,regime,"recent",0);const stats=Object.fromEntries(policies.map(p=>[p,{correct:0,answered:0,comparisons:0,contextKnown:0,contextCorrect:0,earlyCorrect:0,earlyQueries:0,returnCorrect:0,inferenceScans:0,fallbackQueries:0,wrongAccepted:0}]));
  const noisy=rng(seed*12289+93331),signals=Array.from({length:24},(_,e)=>phase(regime,e)^Number(noisy(5)===0));
  for(let e=0;e<24;e++){
   s=env.step(s);const rows=s.memory.map(clean).sort(newest),inferred=infer(rows),truth=phase(regime,e),test=queries(seed,regime,e);
   if(rows.some(m=>m.epoch>=e)||rows.length>72)throw Error("delivered boundary");
   for(const p of policies){
    const t=stats[p],tag=p==="oracle"?truth:p==="noisy"?signals[e]:p==="delayed-tag"?(e>=3?phase(regime,e-3):null):p.startsWith("inferred")?inferred.tag:null;
    const tagFor=m=>p==="oracle"||p==="delayed-tag"?phase(regime,m.epoch):p==="noisy"?signals[m.epoch]:inferred.tags.get(m.epoch)??null;
    if(p.startsWith("inferred"))t.inferenceScans+=inferred.scans;
    if(tag!==null){t.contextKnown++;t.contextCorrect+=Number(tag===truth)}
    let epochCorrect=0,epochAnswered=0,epochComparisons=0;
    for(const q of test){
     const all=rows.filter(m=>m.context===q.context);
     let chosen=p==="recent"?all:tag===null?[]:all.filter(m=>tagFor(m)===tag);
     if(p==="inferred-fallback"&&!chosen.length){chosen=all;t.fallbackQueries++}
     let best=null,distance=Infinity;
     for(const m of chosen){const d=Math.abs(m.x-q.x)+Math.abs(m.y-q.y);epochComparisons++;if(d<distance){distance=d;best=m}}
     if(best){epochAnswered++;epochCorrect+=Number(best.label===q.label)}
    }
    if(p==="recent"){const v=s.events.at(-1);if(epochCorrect!==v.correct||epochAnswered!==v.answered||epochComparisons!==v.comparisons)throw Error("native baseline drift")}
    t.correct+=epochCorrect;t.answered+=epochAnswered;t.comparisons+=epochComparisons;t.wrongAccepted+=epochAnswered-epochCorrect;
    if(regime!=="stationary"&&e>=6&&e%6<3){t.earlyCorrect+=epochCorrect;t.earlyQueries+=36}
    if(e>=12)t.returnCorrect+=epochCorrect;
   }
  }
  return stats;
 }
 function report(env,seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>90)throw Error("seed bound");const rows=[];
  for(const regime of regimes){
   const totals=Object.fromEntries(policies.map(p=>[p,{}]));const paired=Object.fromEntries(policies.map(p=>[p,{wins:0,ties:0,losses:0,worst:Infinity}]));
   for(let seed=1;seed<=seeds;seed++){const t=trial(seed,regime,env);for(const p of policies){for(const [k,v]of Object.entries(t[p]))totals[p][k]=(totals[p][k]||0)+v;const delta=t[p].correct-t.recent.correct;paired[p][delta>0?"wins":delta<0?"losses":"ties"]++;paired[p].worst=Math.min(paired[p].worst,delta/864)}}
   for(const p of policies){const t=totals[p],n=seeds*864;rows.push({regime,policy:p,accuracy:t.correct/n,coverage:t.answered/n,conditionalAccuracy:t.answered?t.correct/t.answered:null,contextCoverage:t.contextKnown/(seeds*24),contextAccuracy:t.contextKnown?t.contextCorrect/t.contextKnown:null,earlySwitchAccuracy:t.earlyQueries?t.earlyCorrect/t.earlyQueries:null,returnAccuracy:t.returnCorrect/(seeds*432),meanComparisons:t.comparisons/seeds,meanInferenceScans:t.inferenceScans/seeds,meanFallbackQueries:t.fallbackQueries/seeds,wrongAccepted:t.wrongAccepted,paired:paired[p]})}
  }return {schema:"phi042-context-crucible-v1",authority:"NONE",release:"BLOCKED",seeds,rows};
 }
 function test(env){
  let checks=0;const check=(v,m)=>{if(!v)throw Error(m);checks++};
  const rows=[0,1,2,3].map((id)=>({id,epoch:2,context:0,x:0,y:8,label:0}));
  check(infer(rows).tag===0,"phase zero");check(infer(rows.map(x=>({...x,label:2}))).tag===1,"phase one");check(infer(rows.slice(0,2)).tag===null,"minimum");check(infer(rows.map((x,i)=>({...x,label:i%2?2:0}))).tag===null,"tie");check(infer([]).tag===null,"empty");
  let denied=false;try{infer([{...rows[0],tag:0}])}catch{denied=true}check(denied,"oracle field refused");
  for(const regime of regimes){const t=trial(7,regime,env);for(const p of policies){check(t[p].correct<=t[p].answered&&t[p].answered<=864,"counts");check(t[p].contextCorrect<=t[p].contextKnown&&t[p].contextKnown<=24,"context counts");check(t[p].comparisons<=864*72,"capacity");check(t[p].wrongAccepted===t[p].answered-t[p].correct,"wrong accepts")}}
  check(same(report(env,2),report(env,2)),"determinism");return {status:"passed",checks};
 }
 return {infer,trial,report,test};
}
export const {infer,trial,report,test}=crucible();
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){console.log(JSON.stringify(process.argv[2]==='test'?test(native):report(native,90),null,2));}
