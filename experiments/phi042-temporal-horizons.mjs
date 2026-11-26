// Φ042 temporal horizon experiment; no runtime mutation.
import * as native from './phi030-memory.mjs';
import * as prior from './phi042-context-crucible.mjs';
import {pathToFileURL} from 'node:url';
function horizons(){
 const regimes=["stationary","recurrent","delayed","contradictory"],policies=["recent","prior-fallback","horizon-2","horizon-3","fresh-vote","dual-agree"],newest=(a,b)=>b.epoch-a.epoch||b.id-a.id;
 const phase=(r,e)=>r==="stationary"?0:Math.floor(e/6)%2;
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function queries(seed,r,e){const rand=rng(seed*104729+(e+1)*1000033+47*1000003);return Array.from({length:36},(_,i)=>{const context=i%3,x=rand(9),y=rand(9),axis=(context===1?1:0)^phase(r,e);return {context,x,y,label:Math.floor((axis?y:x)/3)}})}
 const clean=m=>({id:m.id,epoch:m.epoch,context:m.context,x:m.x,y:m.y,label:m.label});
 function estimate(rows,e,infer){
  if(!Number.isInteger(e)||e<0||e>=24||!Array.isArray(rows)||rows.length>72||new Set(rows.map(m=>m.id)).size!==rows.length||rows.some(m=>Object.keys(m).sort().join(",")!=="context,epoch,id,label,x,y"||!Number.isInteger(m.epoch)||m.epoch<0||m.epoch>=e||!Number.isInteger(m.id)||m.id<0||![0,1,2].includes(m.context)||![0,1,2].includes(m.label)||![m.x,m.y].every(v=>Number.isInteger(v)&&v>=0&&v<=8)))throw Error("delivered evidence boundary");
  const old=infer(rows),age=old.latest<0?null:e-old.latest;
  const votes=[0,0];let informative=0;
  for(const m of rows){const lag=e-m.epoch;if(lag>3)continue;
   const a=Math.floor((m.context===1?m.y:m.x)/3),b=Math.floor((m.context===1?m.x:m.y)/3);
   if(a===b)continue;
   if(m.label===a||m.label===b){votes[Number(m.label===b)]+=4-lag;informative++}
  }
  const fresh=informative>=3&&Math.abs(votes[0]-votes[1])>=2?Number(votes[1]>votes[0]):null;
  return {old:old.tag,age,tags:old.tags,fresh,votes,informative,scans:rows.length,previousScans:old.scans};
 }
 function tagFor(p,est){return p==="recent"?null:p==="fresh-vote"||p==="dual-agree"?est.fresh:p==="horizon-2"&&!(est.age!==null&&est.age<=2)?null:p==="horizon-3"&&!(est.age!==null&&est.age<=3)?null:est.old}
 function nearest(rows,q){let best=null,d=Infinity;for(const m of rows){const n=Math.abs(m.x-q.x)+Math.abs(m.y-q.y);if(n<d){best=m;d=n}}return {label:best?.label??null,cost:rows.length}}
 function predict(p,all,q,est){
  if(p==="recent")return {...nearest(all,q),fallback:false};
  if(p==="dual-agree"){
   const a=nearest(all.filter(m=>est.tags.get(m.epoch)===0),q),b=nearest(all.filter(m=>est.tags.get(m.epoch)===1),q);
   const selected=est.fresh===0?a:est.fresh===1?b:null;
   if(selected)return {label:selected.label,cost:a.cost+b.cost,fallback:false};
   return {label:a.label!==null&&a.label===b.label?a.label:null,cost:a.cost+b.cost,fallback:false};
  }
  const tag=tagFor(p,est),selected=tag===null?[]:all.filter(m=>est.tags.get(m.epoch)===tag);
  return {...nearest(selected.length?selected:all,q),fallback:!selected.length};
 }
 function trial(seed,regime,env,old){
  let s=env.run(seed,regime,"recent",0);
  const stats=Object.fromEntries(policies.map(p=>[p,{correct:0,answered:0,comparisons:0,scans:0,fallback:0,earlyCorrect:0,earlyTotal:0,contextKnown:0,contextCorrect:0,staleKnown:0}]));
  for(let e=0;e<24;e++){
   s=env.step(s);const rows=s.memory.map(clean).sort(newest),est=estimate(rows,e,old.infer),truth=phase(regime,e),qs=queries(seed,regime,e);
   for(const p of policies){
    const t=stats[p],tag=tagFor(p,est);
    t.scans+=p==="recent"?0:est.previousScans+(p==="fresh-vote"||p==="dual-agree"?est.scans:0);
    if(tag!==null){t.contextKnown++;t.contextCorrect+=Number(tag===truth);t.staleKnown+=Number(est.age>2)}
    let c=0,answered=0,cost=0;
    for(const q of qs){const v=predict(p,rows.filter(m=>m.context===q.context),q,est);cost+=v.cost;t.fallback+=Number(v.fallback);if(v.label!==null){answered++;c+=Number(v.label===q.label)}}
    if(p==="recent"){const v=s.events.at(-1);if(c!==v.correct||answered!==v.answered||cost!==v.comparisons)throw Error("native drift")}
    t.correct+=c;t.answered+=answered;t.comparisons+=cost;
    if(regime!=="stationary"&&e>=6&&e%6<3){t.earlyCorrect+=c;t.earlyTotal+=36}
   }
  }
  return stats;
 }
 function report(env,old,seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>90)throw Error("seeds");const rows=[];
  for(const regime of regimes){const sums=Object.fromEntries(policies.map(p=>[p,{}])),pairs=Object.fromEntries(policies.map(p=>[p,{wins:0,ties:0,losses:0,worst:0}]));
   for(let i=1;i<=seeds;i++){const t=trial(i,regime,env,old),ref=old.trial(i,regime,env)["inferred-fallback"];
    if(t["prior-fallback"].correct!==ref.correct||t["prior-fallback"].answered!==ref.answered||t["prior-fallback"].comparisons!==ref.comparisons)throw Error("prior drift");
    for(const p of policies){for(const [k,v]of Object.entries(t[p]))sums[p][k]=(sums[p][k]||0)+v;const d=t[p].correct-t["prior-fallback"].correct;pairs[p][d>0?"wins":d<0?"losses":"ties"]++;pairs[p].worst=Math.min(pairs[p].worst,d/864)}
   }
   for(const p of policies){const s=sums[p];rows.push({regime,policy:p,accuracy:s.correct/(seeds*864),coverage:s.answered/(seeds*864),conditionalAccuracy:s.answered?s.correct/s.answered:null,earlySwitchAccuracy:s.earlyTotal?s.earlyCorrect/s.earlyTotal:null,contextCoverage:s.contextKnown/(seeds*24),contextAccuracy:s.contextKnown?s.contextCorrect/s.contextKnown:null,staleKnown:s.staleKnown,meanComparisons:s.comparisons/seeds,meanScans:s.scans/seeds,meanFallback:s.fallback/seeds,wrongAccepted:s.answered-s.correct,paired:pairs[p]})}
  }return {schema:"phi042-temporal-horizons-v1",authority:"NONE",release:"BLOCKED",seeds,rows};
 }
 function test(env,old){
  let checks=0;const check=(v,m)=>{if(!v)throw Error(m);checks++},deny=f=>{try{f();return false}catch{return true}};
  const rows=Array.from({length:4},(_,id)=>({id,epoch:1,context:0,x:0,y:8,label:0}));
  check(estimate(rows,2,old.infer).fresh===0,"fresh");check(estimate(rows,5,old.infer).fresh===null,"expired");check(estimate(rows,5,old.infer).age===4,"age");check(estimate([],3,old.infer).fresh===null,"empty");check(deny(()=>estimate(rows,1,old.infer)),"future");check(deny(()=>estimate([{...rows[0],tag:0}],2,old.infer)),"oracle");check(deny(()=>estimate([rows[0],rows[0]],2,old.infer)),"duplicate");
  check(predict("dual-agree",rows,{x:0,y:8},{fresh:null,tags:new Map([[1,0]])}).label===null,"one hypothesis not agreement");
  for(const r of regimes){const t=trial(7,r,env,old);for(const p of policies){check(t[p].correct<=t[p].answered&&t[p].answered<=864,"counts");check(t[p].comparisons<=864*72,"cost");check(t[p].contextCorrect<=t[p].contextKnown,"context");check(t[p].scans<=24*144,"scan cap")}}
  check(JSON.stringify(report(env,old,2))===JSON.stringify(report(env,old,2)),"replay");return {status:"passed",checks};
 }
 return {estimate,predict,trial,report,test};
}
export const {estimate,predict,trial,report,test}=horizons();
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(process.argv[2]==='test'?test(native,prior):report(native,prior,90),null,2));
