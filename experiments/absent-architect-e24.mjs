// ΦGenesis Absent Architect E2.4 — bounded peer observation; synthetic only.
function experiment(){
 const ids=Array.from({length:9},(_,i)=>i),train=[0,1,3],held=[5,6,7,8],family=Array.from({length:36},(_,i)=>({r:Math.floor(i/9),b:i%9})),regimes=["stable","global-shift","local-shift","shared-burst","domain-burst"],policies=["local1","local3","same-domain3","diverse3","adaptive-diverse"],rounds=36;
 const mod=x=>((x%3)+3)%3,uniform=()=>Array(36).fill(1/36);
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function transform(c,h){let x=c%3,y=Math.floor(c/3);for(let i=0;i<h.r;i++)[x,y]=[-y,x];return mod(x+h.b%3)+3*mod(y+Math.floor(h.b/3))}
 function oracle(c,h){const x=c%3,y=Math.floor(c/3),v=[[x,y],[-y,x],[-x,-y],[y,-x]][h.r];return mod(v[0]+h.b%3)+3*mod(v[1]+Math.floor(h.b/3))}
 function fixture(seed){const r=rng(seed),noise=()=>r(10)===0?1+r(8):0,i=r(36);return {h:family[i],next:family[(i+1+r(35))%36],change:9+r(12),local:r(9),domain:r(3),offset:1+r(8),old:ids.map(()=>Array.from({length:6},noise)),stream:Array.from({length:rounds},()=>ids.map(()=>Array.from({length:3},noise)))}}
 const domain=id=>Math.floor(id/3);
 function changed(f,g,id){return g==="global-shift"||g==="local-shift"&&id===f.local}
 function truth(f,g,id,t,c){return oracle(c,t>=f.change&&changed(f,g,id)?f.next:f.h)}
 function observations(f,g){return {old:ids.map(id=>f.old[id].map((n,i)=>({c:train[i%3],y:(oracle(train[i%3],f.h)+n)%9}))),stream:f.stream.map((row,t)=>row.map((rep,id)=>rep.map(n=>{const c=train[t%3],burst=t>=f.change&&t<f.change+4&&(g==="shared-burst"||g==="domain-burst"&&domain(id)===f.domain);return (truth(f,g,id,t,c)+(burst?f.offset:n))%9}))) }}
 function update(w,s){const a=w.map((p,i)=>p*(transform(s.c,family[i])===s.y?.9:.0125)),z=a.reduce((a,b)=>a+b,0);return a.map(x=>x/z)}
 const fold=a=>a.reduce(update,uniform());
 function model(w){const confidence=Math.max(...w);return {index:w.indexOf(confidence),confidence}}
 function peers(id,kind){const x=id%3,y=domain(id);return kind==="same-domain3"?[y*3+(x+1)%3,y*3+(x+2)%3]:[((y+1)%3)*3+x,((y+2)%3)*3+x]}
 function vote(values){if(values.length===1)return values[0];return values[1]===values[2]?values[1]:values[0]}
 function step(state,c,values){const y=vote(values),before=model(state.w),mismatch=transform(c,family[before.index])!==y;let alarm=false;const s={c,y};
  if(mismatch&&state.last!==null){state.w=fold([state.last,s]);state.last=null;alarm=true}else{state.w=update(state.w,s);state.last=mismatch?s:null}
  const after=model(state.w);return {y,alarm,confidence:after.confidence,predictions:after.confidence>=.9?held.map(c=>transform(c,family[after.index])):null}}
 // In-process read-only port, actor bound by caller; no target labels or world state.
 function port(id,frame,policy){let used=0;const events=[];const allowed=policy==="same-domain3"||policy==="diverse3"||policy==="adaptive-diverse"?peers(id,policy):[];
  function read(source,replica){if(!Number.isInteger(source)||!Number.isInteger(replica)||!ids.includes(source)||replica<0||replica>2||used>=3||events.some(e=>e.source===source&&e.replica===replica)||!(source===id&&(replica===0||policy==="local3")||allowed.includes(source)&&replica===0))throw Error("scope or budget");
   used++;events.push({source,replica});return frame[source][replica]}
  return {read,events}}
 function run(o,policy){if(!policies.includes(policy)||o.old.length!==9||o.stream.length>36)throw Error("config");
  const states=o.old.map(samples=>({w:fold(samples),last:null})),events=[];
  for(let t=0;t<o.stream.length;t++){const c=train[t%3],frame=o.stream[t];
   events.push(states.map((s,id)=>{const p=port(id,frame,policy),values=[p.read(id,0)],before=model(s.w);
    if(policy==="local3")values.push(p.read(id,1),p.read(id,2));
    if(policy==="same-domain3"||policy==="diverse3"||policy==="adaptive-diverse"&&(before.confidence<.9||transform(c,family[before.index])!==values[0]))for(const peer of peers(id,policy))values.push(p.read(peer,0));
    const v=step(s,c,values);return {...v,reads:p.events.length,messages:p.events.filter(e=>e.source!==id).length,sources:p.events}
   }))
  }
  return events
 }
 function evaluate(f,g,events){const s={correct:0,wrong:0,postCorrect:0,postWrong:0,postN:0,affectedCorrect:0,affectedWrong:0,affectedN:0,unaffectedWrong:0,unaffectedN:0,obsCorrect:0,reads:54,messages:0,falseAlarms:0,postAlarms:0,detected:0,delay:0,changedRoots:0,utility:0,postUtility:0};const first=Array(9).fill(null);
  for(let t=0;t<events.length;t++)for(const id of ids){const e=events[t][id],post=t>=f.change,affected=changed(f,g,id),actual=truth(f,g,id,t,train[t%3]);s.obsCorrect+=Number(e.y===actual);s.reads+=e.reads;s.messages+=e.messages;
   if(post){s.postN+=4;s.postUtility-=.25*e.reads+.1*e.messages;if(affected)s.affectedN+=4;else s.unaffectedN+=4}
   if(e.alarm){if(post&&affected){s.postAlarms++;if(first[id]===null)first[id]=t-f.change}else s.falseAlarms++}
   if(e.predictions)for(let i=0;i<4;i++){const ok=e.predictions[i]===truth(f,g,id,t,held[i]);s.correct+=Number(ok);s.wrong+=Number(!ok);if(post){s.postCorrect+=Number(ok);s.postWrong+=Number(!ok);s.postUtility+=ok?3:-2;if(affected){s.affectedCorrect+=Number(ok);s.affectedWrong+=Number(!ok)}else s.unaffectedWrong+=Number(!ok)}}
  }
  for(const id of ids)if(changed(f,g,id)){s.changedRoots++;if(first[id]!==null){s.detected++;s.delay+=first[id]}}
  s.utility=3*s.correct-2*s.wrong-.25*s.reads-.1*s.messages;return s}
 function report(seeds=90){if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed budget");const rows=[];
  for(const g of regimes)for(const p of policies){let sum=null;for(let seed=1;seed<=seeds;seed++){const f=fixture(seed),v=evaluate(f,g,run(observations(f,g),p));if(!sum)sum=Object.fromEntries(Object.keys(v).map(k=>[k,0]));for(const k of Object.keys(v))sum[k]+=v[k]}
   const s=sum,n=seeds*9,ratio=(a,b)=>b?a/b:null;rows.push({regime:g,policy:p,observationAccuracy:s.obsCorrect/(n*36),postCorrect:ratio(s.postCorrect,s.postN),postWrong:ratio(s.postWrong,s.postN),affectedCorrect:ratio(s.affectedCorrect,s.affectedN),affectedWrong:ratio(s.affectedWrong,s.affectedN),unaffectedWrong:ratio(s.unaffectedWrong,s.unaffectedN),reads:s.reads/n,messages:s.messages/n,falseAlarms:s.falseAlarms/n,detection:ratio(s.detected,s.changedRoots),delay:ratio(s.delay,s.detected),utility:s.utility/n,postUtility:s.postUtility/n});
  }
  return {schema:"absent-architect-e24-v1",status:"SIMULATED",authority:"NONE",seeds,rows}}
 function test(){let checks=0;const assert=(x,m)=>{if(!x)throw Error(m);checks++};for(const h of family)for(const c of ids)assert(transform(c,h)===oracle(c,h),"oracle");
  for(const id of ids){assert(peers(id,"same-domain3").every(i=>i!==id&&domain(i)===domain(id)),"same domain");assert(new Set([id,...peers(id,"diverse3")].map(domain)).size===3,"distinct domains")}
  assert(vote([1,2,3])===1&&vote([1,2,2])===2&&vote([1,1,2])===1,"voting and tie");
  for(const seed of [1,7,19])for(const g of regimes){const f=fixture(seed),o=observations(f,g),before=JSON.stringify(o);
   for(const p of policies){const a=run(o,p),v=evaluate(f,g,a);assert(JSON.stringify(a)===JSON.stringify(run(o,p)),"replay");assert(JSON.stringify(a.slice(0,12))===JSON.stringify(run({...o,stream:o.stream.slice(0,12)},p)),"causal prefix");assert(v.correct+v.wrong<=9*36*4&&v.postCorrect+v.postWrong<=v.postN,"outcomes");
    for(const row of a)for(const [id,e] of row.entries()){assert(e.reads>=1&&e.reads<=3&&e.messages<=2,"budget");assert(e.sources.every(s=>s.source===id||peers(id,p).includes(s.source)&&s.replica===0),"scope");assert(e.reads===(p==="local1"?1:p==="adaptive-diverse"?e.messages+1:3),"matched costs")}
    assert(v.reads===54+a.flat().reduce((s,e)=>s+e.reads,0),"ledger");assert(v.messages===a.flat().reduce((s,e)=>s+e.messages,0),"message ledger");
   }assert(JSON.stringify(o)===before,"immutable observation fixture")}
  const f=fixture(7),o=observations(f,"stable"),p=port(0,o.stream[0],"diverse3");let refused=0;for(const [source,replica] of [[1,0],[3,1],[0,2],[-1,0]])try{p.read(source,replica)}catch{refused++}assert(refused===4&&p.events.length===0,"scope refusal");p.read(0,0);try{p.read(0,0)}catch{refused++}assert(refused===5&&p.events.length===1,"duplicate refusal");p.read(3,0);p.read(6,0);try{p.read(6,0)}catch{refused++}assert(refused===6&&p.events.length===3,"exhausted budget");
  assert(JSON.stringify(report(3))===JSON.stringify(report(3)),"report replay");return {checks,status:"passed"}}
 return {report,test}
}
const engine=experiment();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e24.mjs [test|report [seeds]]');
