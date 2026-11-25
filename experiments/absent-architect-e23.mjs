// ΦGenesis Absent Architect E2.3 — online change detection; synthetic only.
function experiment(){
 const ids=Array.from({length:9},(_,i)=>i), train=[0,1,3], held=[5,6,7,8], family=Array.from({length:36},(_,i)=>({r:Math.floor(i/9),b:i%9})), regimes=["stable","related","unrelated","burst","scrambled"], policies=["frozen","cumulative","window6","hazard","alarm-reset","abstain"], rounds=36;
 const mod=x=>((x%3)+3)%3, uniform=()=>Array(36).fill(1/36);
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function transform(c,h){let x=c%3,y=Math.floor(c/3);for(let i=0;i<h.r;i++)[x,y]=[-y,x];return mod(x+h.b%3)+3*mod(y+Math.floor(h.b/3))}
 function oracle(c,h){const x=c%3,y=Math.floor(c/3),v=[[x,y],[-y,x],[-x,-y],[y,-x]][h.r];return mod(v[0]+h.b%3)+3*mod(v[1]+Math.floor(h.b/3))}
 function fixture(seed){
  const r=rng(seed),noise=()=>({flip:r(10)===0,offset:1+r(8)});
  return ids.map(root=>{const h=family[r(36)],near=family.filter(k=>k!==h&&(k.r===h.r||k.b===h.b)),far=family.filter(k=>k.r!==h.r&&k.b!==h.b);return {root,h,near:near[r(near.length)],far:far[r(far.length)],change:9+r(12),scrambled:ids.map(()=>r(9)),oldNoise:Array.from({length:6},noise),streamNoise:Array.from({length:rounds},noise)}})
 }
 function target(f,g,t,c){if(t<f.change||g==="stable"||g==="burst")return oracle(c,f.h);if(g==="related")return oracle(c,f.near);if(g==="unrelated")return oracle(c,f.far);return f.scrambled[c]}
 function observations(f,g){
  const old=Array.from({length:6},(_,i)=>{const c=train[i%3],n=f.oldNoise[i],y=oracle(c,f.h);return {c,y:n.flip?(y+n.offset)%9:y}});
  const stream=Array.from({length:rounds},(_,i)=>{const c=train[i%3],n=f.streamNoise[i],y=target(f,g,i,c),burst=g==="burst"&&i>=f.change&&i<f.change+4;return {c,y:n.flip||burst?(y+n.offset)%9:y}});
  return {old,stream}
 }
 function valid(s){return s&&Object.keys(s).sort().join(",")==="c,y"&&train.includes(s.c)&&ids.includes(s.y)}
 function update(w,s){if(!valid(s))throw Error("invalid observation");const a=w.map((p,i)=>p*(transform(s.c,family[i])===s.y?.9:.0125)),z=a.reduce((a,b)=>a+b,0);if(!(z>0))throw Error("empty posterior");return a.map(x=>x/z)}
 function fold(a){return a.reduce(update,uniform())}
 function model(w){const confidence=Math.max(...w);return {index:w.indexOf(confidence),confidence}}
 // Learner receives only observation records, never the world, regime, shift time or scores.
 function run(old,stream,policy){
  if(!policies.includes(policy)||old.length!==6||stream.length>rounds||!old.every(valid)||!stream.every(valid))throw Error("invalid input");
  let w=policy==="abstain"?uniform():fold(old),history=old.slice(),lastMismatch=null;
  const events=[];
  for(let t=0;t<stream.length;t++){
   const s=stream[t],before=model(w);let alarm=false;
   if(policy==="cumulative")w=update(w,s);
   else if(policy==="window6"){history.push(s);history=history.slice(-6);w=fold(history)}
   else if(policy==="hazard")w=update(w.map(x=>.9*x+.1/36),s);
   else if(policy==="alarm-reset"){
    const mismatch=transform(s.c,family[before.index])!==s.y;
    if(mismatch&&lastMismatch!==null){w=fold([lastMismatch,s]);alarm=true;lastMismatch=null}
    else {w=update(w,s);lastMismatch=mismatch?s:null}
   }
   const after=model(w),admitted=policy!=="abstain"&&after.confidence>=.9;
   events.push({t,read:policy!=="frozen"&&policy!=="abstain"?1:0,alarm,confidence:after.confidence,predictions:admitted?held.map(c=>transform(c,family[after.index])):null});
  }
  return {initialReads:policy==="abstain"?0:6,events}
 }
 function evaluate(f,g,result){
  const changed=["related","unrelated","scrambled"].includes(g);let correct=0,wrong=0,postCorrect=0,postWrong=0,postN=0,reads=result.initialReads,preAlarms=0,postAlarms=0,first=null;
  for(const e of result.events){reads+=e.read;const post=e.t>=f.change;if(post)postN+=held.length;
   if(e.alarm){if(changed&&post){postAlarms++;if(first===null)first=e.t-f.change}else preAlarms++}
   if(e.predictions)for(let i=0;i<held.length;i++){const ok=e.predictions[i]===target(f,g,e.t,held[i]);correct+=Number(ok);wrong+=Number(!ok);if(post){postCorrect+=Number(ok);postWrong+=Number(!ok)}}
  }
  return {correct,wrong,postCorrect,postWrong,postN,reads,preAlarms,postAlarms,detected:Number(first!==null),delay:first,utility:3*correct-2*wrong-.25*reads}
 }
 function report(seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed budget");
  const worlds=Array.from({length:seeds},(_,i)=>fixture(i+1)),rows=[];
  for(const g of regimes)for(const p of policies){
   const s={correct:0,wrong:0,postCorrect:0,postWrong:0,postN:0,reads:0,preAlarms:0,postAlarms:0,detected:0,delay:0,utility:0};
   for(const world of worlds)for(const f of world){const o=observations(f,g),v=evaluate(f,g,run(o.old,o.stream,p));for(const k of Object.keys(s))s[k]+=v[k]??0}
   const n=seeds*9,changed=["related","unrelated","scrambled"].includes(g);
   rows.push({regime:g,policy:p,coverage:(s.correct+s.wrong)/(n*rounds*4),postCoverage:(s.postCorrect+s.postWrong)/s.postN,postCorrectRate:s.postCorrect/s.postN,postWrongRate:s.postWrong/s.postN,postConditionalAccuracy:s.postCorrect+s.postWrong?s.postCorrect/(s.postCorrect+s.postWrong):null,reads:s.reads/n,utility:s.utility/n,falseAlarms:s.preAlarms/n,postAlarms:s.postAlarms/n,detectionRate:changed&&p==="alarm-reset"?s.detected/n:null,meanDelay:changed&&p==="alarm-reset"&&s.detected?s.delay/s.detected:null});
  }
  return {schema:"absent-architect-e23-v1",status:"SIMULATED",authority:"NONE",seeds,rows}
 }
 function test(){
  let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++};
  for(const h of family)for(const c of ids)assert(transform(c,h)===oracle(c,h),"independent evaluator");
  for(const f of fixture(7))for(const g of regimes){const o=observations(f,g),before=JSON.stringify(o);assert(o.old.length===6&&o.stream.length===36&&o.old.every(valid)&&o.stream.every(valid),"observation schema");for(const p of policies){
   const a=run(o.old,o.stream,p),prefix=run(o.old,o.stream.slice(0,12),p),v=evaluate(f,g,a);
   assert(JSON.stringify(prefix.events)===JSON.stringify(a.events.slice(0,12)),"causal prefix");assert(JSON.stringify(a)===JSON.stringify(run(o.old,o.stream,p)),"replay");
   assert(v.reads===(p==="abstain"?0:p==="frozen"?6:42),"read accounting");assert(v.correct+v.wrong<=144&&v.postCorrect+v.postWrong<=v.postN,"outcomes");assert(v.utility===3*v.correct-2*v.wrong-.25*v.reads,"utility");assert(a.events.every(e=>e.confidence>=0&&e.confidence<=1+1e-12&&(!e.predictions||e.predictions.length===4&&e.predictions.every(x=>ids.includes(x)))),"valid output");
   if(p!=="alarm-reset")assert(a.events.every(e=>!e.alarm),"no spurious alarm fields");if(p==="abstain")assert(v.utility===0&&v.correct===0&&v.wrong===0,"zero baseline");
  }assert(JSON.stringify(o)===before,"immutable observations")}
  let refused=false;try{run(Array(6).fill({c:5,y:0}),[],"hazard")}catch{refused=true}assert(refused,"reject heldout input");
  const old=train.concat(train).map(c=>({c,y:oracle(c,family[0])})),stream=[{c:0,y:1},{c:1,y:2}];assert(run(old,stream,"alarm-reset").events[1].alarm,"known contradiction reset");assert(JSON.stringify(report(3))===JSON.stringify(report(3)),"report replay");return {checks,status:"passed"}
 }
 return {report,test}
}
const engine=experiment();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e23.mjs [test|report [seeds]]');
