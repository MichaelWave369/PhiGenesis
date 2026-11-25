// Genesis Field v0.4 — cost-aware strategy selection using v0.3 primitives.
import * as peerAPI from "./field-v03.mjs";
const HORIZONS=[1,4,9],QUALITY=["clean","noisy"],SOURCE=["existing","fresh"],METHODS=["cold","memory","peer"],TEST=[29,30,31];
function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function shuffle(list,next){let a=[...list];for(let i=a.length-1;i>0;i--){let j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

function mask(x,p){let r=0;for(let i=0;i<5;i++)if(x&(1<<i))r|=1<<p[i];return r;}

function invert(p){return Array.from({length:5},(_,i)=>p.indexOf(i));}

function oracle(r,x){let y=r.bias;for(const t of r.terms){let v=1;for(let i=0;i<5;i++)if(Math.floor(t/2**i)%2)v*=Math.floor(x/2**i)%2;y+=v;}return y%2;}

function local(r,p){let inv=invert(p);return x=>oracle(r,mask(x,inv));}

function contexts(){return HORIZONS.flatMap(h=>QUALITY.flatMap(q=>SOURCE.map(s=>({h,q,s}))));}

function key(c){return [c.h,c.q,c.s].join(":");}

function batch(api,c,seed){
 const next=rng(seed),pa=shuffle([0,1,2,3,4],next),pc=shuffle([0,1,2,3,4],next);
 const terms=[];for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)terms.push((1<<i)|(1<<j));terms.sort((a,b)=>a-b);
 const pairs=[];for(let i=0;i<terms.length;i++)for(let j=i+1;j<terms.length;j++)pairs.push([terms[i],terms[j]]);
 const tasks=shuffle(pairs,next).slice(0,c.h).map(terms=>({truth:{bias:next()&1,terms},corrupt:c.q==="noisy"&&next()%3===0}));
 const sender=api.instance("A"),memory=api.instance("C-memory"),peer=api.instance("C-peer");
 const anchors=Array.from({length:5},(_,i)=>[1<<pa[i],1<<pc[i]]);
 let cost={cold:0,memory:0,peer:10}, sourceQueries=0,peerAudit=0,peerFallback=0,bytes=JSON.stringify(anchors).length, rejected=0, corruptions=0;
 let exact={cold:0,memory:0,peer:0}, heldout={cold:0,memory:0,peer:0};
 const verify=(m,r,expected,obs)=>{if(r.status!=="accepted")return;exact[m]+=Number(JSON.stringify(r.rule)===JSON.stringify(expected));for(const x of TEST)heldout[m]+=Number(oracle(r.rule,x)===obs(x));};
 for(let i=0;i<tasks.length;i++){
  const {truth,corrupt}=tasks[i],world="w"+(i+1),obs=local(truth,pc),expected=api.translate(truth,pc);
  const cold=api.learn(api.instance("cold"),world,obs,{useMemory:false}),mem=api.learn(memory,world,obs);
  cost.cold+=cold.used;cost.memory+=mem.used;verify("cold",cold,expected,obs);verify("memory",mem,expected,obs);
  const src=api.learn(sender,world,local(truth,pa));
  if(src.status!=="accepted")throw Error("sender failed");
  sourceQueries+=src.used;
  const proposed={bias:src.rule.bias^(corrupt?1:0),terms:src.rule.terms};
  const msg=api.packet("A",world,proposed);bytes+=msg.length;corruptions+=Number(corrupt);
  const received=api.receive(peer,msg,anchors,obs,"A",world);
  peerAudit+=received.used;cost.peer+=received.used;
  let result=received;
  if(received.status!=="accepted"){rejected++;result=api.learn(peer,world,obs);peerFallback+=result.used;cost.peer+=result.used;}
  verify("peer",result,expected,obs);
 }
 const incrementalPeer=cost.peer;const fullyChargedPeer=incrementalPeer+sourceQueries;
 if(c.s==="fresh")cost.peer=fullyChargedPeer;
 return {seed,context:key(c),targets:c.h,cost,sourceQueries,peerAudit,peerFallback,anchorEndpoints:10,wireBytes:bytes,incrementalPeer,fullyChargedPeer,rejected,corruptions,exact,heldout};
}

function fit(rows){
 const model={};
 for(const c of contexts()){
  const group=rows.filter(r=>r.context===key(c));
  if(!group.length)throw Error("missing calibration context");
  const means=Object.fromEntries(METHODS.map(m=>[m,group.reduce((s,r)=>s+r.cost[m],0)/group.length]));
  const chosen=METHODS.reduce((a,b)=>means[b]<means[a]?b:a);
  model[key(c)]={chosen,means};
 }
 return model;
}

function report(api,nTrain=18,nTest=30){
 if(!Number.isInteger(nTrain)||!Number.isInteger(nTest)||nTrain<1||nTest<1||nTrain>100||nTest>100)throw Error("invalid seed budget");
 const calibration=[],evaluation=[];
 for(const [j,c] of contexts().entries()){
  for(let i=0;i<nTrain;i++)calibration.push(batch(api,c,(0x6b8b4567+j*10007+i)>>>0));
  for(let i=0;i<nTest;i++)evaluation.push(batch(api,c,(0x93d721b9+j*10007+i)>>>0));
 }
 const policy=fit(calibration);
 const totals={cold:0,memory:0,peer:0,adaptive:0,hindsight:0},counts={cold:0,memory:0,peer:0},rows=[];
 let targetCount=0,adaptiveExact=0,adaptiveHeldout=0,corruptions=0,rejected=0,adaptiveSource=0;
 for(const r of evaluation){
  const choice=policy[r.context].chosen;counts[choice]++;targetCount+=r.targets;
  for(const m of METHODS)totals[m]+=r.cost[m];
  totals.adaptive+=r.cost[choice];totals.hindsight+=Math.min(...METHODS.map(m=>r.cost[m]));
  adaptiveExact+=r.exact[choice];adaptiveHeldout+=r.heldout[choice];corruptions+=r.corruptions;rejected+=r.rejected;
  if(choice==="peer")adaptiveSource+=r.sourceQueries;
  rows.push({...r,choice});
 }
 const perContext=Object.fromEntries(contexts().map(c=>{
  const group=rows.filter(r=>r.context===key(c));
  return [key(c),{choice:policy[key(c)].chosen,meanCosts:Object.fromEntries(METHODS.map(m=>[m,group.reduce((s,r)=>s+r.cost[m],0)/group.length]))}];
 }));
 const calibrationCost=calibration.reduce((s,r)=>s+r.cost.cold+r.cost.memory+r.fullyChargedPeer,0);
 return {nTrain,nTest,calibrationBatches:calibration.length,evaluationBatches:rows.length,targetCount,policy,totals,counts,perContext,adaptiveExact,adaptiveHeldout,corruptions,rejected,adaptiveSource,calibrationCost,calibration,rows};
}

function checks(api,result){
 const out=[];function test(n,f){f();out.push(n);}function assert(x,m){if(!x)throw Error(m);}
 test("all policies exact and held-out",()=>{for(const r of [...result.calibration,...result.rows])for(const m of METHODS){assert(r.exact[m]===r.targets,"exact");assert(r.heldout[m]===r.targets*3,"heldout");}});
 test("all corruptions rejected",()=>assert([...result.calibration,...result.rows].every(r=>r.rejected===r.corruptions),"corruption"));
 test("full accounting",()=>{for(const r of [...result.calibration,...result.rows]){assert(r.incrementalPeer===r.anchorEndpoints+r.peerAudit+r.peerFallback,"incremental");assert(r.fullyChargedPeer===r.incrementalPeer+r.sourceQueries,"full");assert(r.cost.peer===(r.context.endsWith(":fresh")?r.fullyChargedPeer:r.incrementalPeer),"scope");}});
 test("frozen calibration policy",()=>assert(JSON.stringify(fit(result.calibration))===JSON.stringify(result.policy)&&result.rows.every(r=>r.choice===result.policy[r.context].chosen),"policy"));
 test("disjoint seeds",()=>assert(!result.calibration.some(a=>result.rows.some(b=>a.seed===b.seed)),"seed leakage"));
 test("repeatability",()=>assert(JSON.stringify(batch(api,contexts()[0],12345))===JSON.stringify(batch(api,contexts()[0],12345)),"repeatability"));
 test("no uncharged fallback",()=>assert(result.rows.every(r=>r.rejected===0?r.peerFallback===0:r.peerFallback>0),"fallback"));
 test("strategy accounting",()=>assert(result.totals.adaptive===result.rows.reduce((s,r)=>s+r.cost[r.choice],0)&&result.totals.hindsight<=result.totals.adaptive,"totals"));
 test("bounds",()=>{let ok=false;try{report(api,0,1);}catch{ok=true;}assert(ok,"bounds");});
 return out;
}
export {batch,fit,contexts,report,checks,peerAPI};
