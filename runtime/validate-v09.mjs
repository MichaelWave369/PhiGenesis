// Genesis Field v0.9 — validation harness; v0.8 unchanged.
import * as core from "./field-v08.mjs";
import * as peerAPI from "./field-v03.mjs";
const MODES=["cold","memory","peer","adaptive"],SEEDS=9,ROUNDS=18;
function rng(seed){let x=seed>>>0||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function shuffle(a,next){a=[...a];for(let i=a.length-1;i>0;i--){const j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

function bits(x){return Array.from({length:5},(_,i)=>Math.floor(x/2**i)%2);}

function model(rule,x){const b=bits(x);return (rule.bias+rule.terms.reduce((s,t)=>s+bits(t).reduce((p,z,i)=>z?p*b[i]:p,1),0))%2;}

function decode(x,p){return p.reduce((s,k,i)=>s+bits(x)[k]*2**i,0);}

function env(seed,i,drift=false,corrupt=false){
 const random=rng((seed+Math.imul(i+1,0x7f4a7c15))>>>0),coord=rng((seed^(drift&&i>=9?0xc6ef3720:0x165667b1))>>>0);
 const maps=Object.fromEntries(["A","B","C"].map(a=>[a,shuffle([0,1,2,3,4],coord)])),terms=shuffle([3,5,6,9,10,12,17,18,20,24],random);
 const rule={bias:random()&1,terms:terms.slice(0,2).sort((a,b)=>a-b)};
 const truth=(actor,x)=>model(rule,decode(x,maps[actor]));
 return {truth,rule,maps,provider:{observe(actor,w,stage,x){return truth(actor,x);},anchors(sender){return maps[sender].map((k,j)=>[2**k,2**maps.C[j]]);},transport(raw){if(!corrupt)return raw;const p=JSON.parse(raw);p.rule.bias^=1;return JSON.stringify(p);}}};
}

function correct(event,truth){return event.status==="accepted"&&Array.from({length:32},(_,x)=>model(event.relation.rule,x)===truth("C",x)).every(Boolean);}

function session(core,api,seed,mode,drift){
 let s=core.create(api,seed,mode);
 const counts={accepted:0,correct:0,falseAccepted:0,abstained:0,total:0,source:0,recipient:0,calibration:0,rejected:0,peerAttempts:0,postDriftRejected:0,postDriftPeerAttempts:0,replay:0};
 for(let i=0;i<ROUNDS;i++){
  const e=env(seed,i,drift,i%5===0);s=core.advance(api,s,e.provider);const last=s.events.at(-1),ok=correct(last,e.truth);
  counts.accepted+=Number(last.status==="accepted");counts.correct+=Number(ok);counts.falseAccepted+=Number(last.status==="accepted"&&!ok);counts.abstained+=Number(last.status!=="accepted");
  for(const k of ["total","source","recipient","calibration"])counts[k]+=last.cost[k];
  const attempted=last.method==="peer",rejected=last.peerStatus==="rejected";
  counts.peerAttempts+=Number(attempted);counts.rejected+=Number(rejected);
  if(i>=9){counts.postDriftRejected+=Number(rejected);counts.postDriftPeerAttempts+=Number(attempted);}
  if(i===8){const t=core.restore(api,core.checkpoint(s));if(JSON.stringify(s)!==JSON.stringify(t))throw Error("mid-session replay");s=t;counts.replay++;}
 }
 if(JSON.stringify(s)!==JSON.stringify(core.restore(api,core.checkpoint(s))))throw Error("final replay");
 return {seed,mode,drift,...counts};
}

function cubicCases(core,api){
 const rows=[];
 for(let mask=1;mask<32;mask++)if(bits(mask).reduce((a,b)=>a+b,0)===3)for(const bias of [0,1]){
  const truth=(actor,x)=>model({bias,terms:[mask]},x);
  for(const mode of MODES){const s=core.advance(api,core.create(api,123,mode),{observe(actor,w,stage,x){return truth(actor,x);},anchors(){return [1,2,4,8,16].map(x=>[x,x]);},transport(x){return x;}});
   const last=s.events[0];rows.push({mask,bias,mode,status:last.status,correct:correct(last,truth),cost:last.cost.total});}
 }return rows;
}

function blindSpots(core,api){
 const rows=[];
 for(let i=0;i<SEEDS;i++){
  const seed=(0x532b1891+i*65537)>>>0,e=env(seed,0),base=core.create(api,seed,"cold"),clean=core.advance(api,base,e.provider);
  const used=new Set(clean.events[0].trace.filter(t=>t.kind==="observation"&&t.actor==="C").map(t=>t.x));
  const unseen=Array.from({length:32},(_,x)=>x).filter(x=>!used.has(x));
  if(!unseen.length)throw Error("no blind spot");
  const flip=unseen[0],truth=(actor,x)=>e.truth(actor,x)^Number(actor==="C"&&x===flip);
  const result=core.advance(api,base,{...e.provider,observe(actor,w,stage,x){return truth(actor,x);}}),last=result.events[0];
  // Separate optional exhaustive certificate, charged here, not part of v0.8 admission.
  const mismatches=last.status==="accepted"?Array.from({length:32},(_,x)=>Number(model(last.relation.rule,x)!==truth("C",x))).reduce((a,b)=>a+b,0):null;
  rows.push({seed,flip,unseen:unseen.length,status:last.status,falseAccepted:last.status==="accepted"&&!correct(last,truth),certificateQueries:last.status==="accepted"?32:0,certificateMismatches:mismatches,baseCost:last.cost.total});
 }return rows;
}

function faults(core,api){
 const rows=[];
 for(let i=0;i<SEEDS;i++){
  const seed=(0xa7bb5401+i*65537)>>>0,e=env(seed,0),s=core.create(api,seed,"cold"),raw=core.checkpoint(s);
  let calls=0,blocked=false;
  try{core.advance(api,s,{...e.provider,observe(...args){if(calls>=5)throw Error("external budget");calls++;return e.provider.observe(...args);}});}catch(err){blocked=err.message==="external budget";}
  const contradicted=core.advance(api,s,{...e.provider,observe(actor,w,stage,x){return e.truth(actor,x)^Number(stage==="test");}});
  const valid=core.advance(api,s,e.provider),d=JSON.parse(core.checkpoint(valid));d.events[0].cost.total++;
  let tamper=false;try{core.restore(api,JSON.stringify(d));}catch{tamper=true;}
  const t=JSON.parse(core.checkpoint(valid));t.events[0].trace[0].x=99;
  let traceTamper=false;try{core.restore(api,JSON.stringify(t));}catch{traceTamper=true;}
  // A coherent alternative history cannot be distinguished without authentication.
  const other=core.advance(api,s,{...e.provider,observe(actor,w,stage,x){return e.truth(actor,x)^1;}});
  const coherentAccepted=JSON.stringify(core.restore(api,core.checkpoint(other)))===JSON.stringify(other);
  rows.push({seed,budgetCalls:calls,budgetBlocked:blocked,originalUnchanged:core.checkpoint(s)===raw,abortedCostAbsent:s.events.length===0,contradictionAbstained:contradicted.events[0].status==="abstained",contradictionNotStored:Object.keys(contradicted.relations).length===0&&contradicted.agents.C.library.length===0,tamper,traceTamper,coherentAccepted});
 }return rows;
}

function report(core,api){
 const sessions=[];
 for(const drift of [false,true])for(const mode of MODES)for(let i=0;i<SEEDS;i++)sessions.push(session(core,api,(0x6a8f13cd+i*65537)>>>0,mode,drift));
 const aggregate={};for(const drift of [false,true]){const a=aggregate[drift?"drift":"fixed"]={};for(const mode of MODES){const rs=sessions.filter(x=>x.drift===drift&&x.mode===mode);a[mode]=Object.fromEntries(Object.keys(rs[0]).filter(k=>!["seed","mode","drift"].includes(k)).map(k=>[k,rs.reduce((s,r)=>s+r[k],0)]));}}
 const cubic=cubicCases(core,api),blind=blindSpots(core,api),fault=faults(core,api);
 return {seeds:SEEDS,rounds:ROUNDS,aggregate,cubic,blind,fault,sessions,findings:{cubicAbstentions:cubic.filter(x=>x.status==="abstained").length,cubicCount:cubic.length,blindFalseAccepts:blind.filter(x=>x.falseAccepted).length,blindCertificatesRejected:blind.filter(x=>x.certificateMismatches>0).length,budgetAbortCount:fault.filter(x=>x.budgetBlocked&&x.originalUnchanged).length,unrecordedAbortCount:fault.filter(x=>x.abortedCostAbsent).length,contradictionAbstentions:fault.filter(x=>x.contradictionAbstained&&x.contradictionNotStored).length,tamperRejected:fault.filter(x=>x.tamper&&x.traceTamper).length,coherentAlternativeAccepted:fault.filter(x=>x.coherentAccepted).length}};
}

function checks(r){
 const names=[];const test=(n,c)=>{if(!c)throw Error(n);names.push(n);};
 test("in-family correctness under fixed and drifting coordinates",r.sessions.every(x=>x.correct===ROUNDS&&x.falseAccepted===0));
 test("full cost accounting",r.sessions.every(x=>x.total===x.source+x.recipient+x.calibration));
 test("mid-run replays",r.sessions.every(x=>x.replay===1));
 test("cubic control rejected",r.findings.cubicAbstentions===r.findings.cubicCount);
 test("known sparse fault blind spot reproduced",r.findings.blindFalseAccepts===SEEDS);
 test("independent exhaustive certificate rejects blind spots",r.findings.blindCertificatesRejected===SEEDS);
 test("external budget stops and state preserved",r.findings.budgetAbortCount===SEEDS&&r.fault.every(x=>x.budgetCalls===5));
 test("aborted costs missing from v08 ledger documented",r.findings.unrecordedAbortCount===SEEDS);
 test("contradictory admission rejected",r.findings.contradictionAbstentions===SEEDS);
 test("derived and trace mutations rejected",r.findings.tamperRejected===SEEDS);
 test("coherent alternate history limitation reproduced",r.findings.coherentAlternativeAccepted===SEEDS);
 return names;
}
export {report,checks,core,peerAPI};
