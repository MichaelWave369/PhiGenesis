// Genesis Field v1.0 RC1 — bounded integrity candidate.
import * as peerAPI from "./field-v03.mjs";
import * as previous from "./field-v08.mjs";
const MODES=["cold","memory","peer","adaptive"],MAX=144,BOUND=192;
class Stop extends Error{constructor(code){super(code);this.code=code;}}

function copy(x){return JSON.parse(JSON.stringify(x));}

function create(api,seed,mode="adaptive"){
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff||!MODES.includes(mode))throw Error("configuration");
 return {schema:10,seed,mode,agents:Object.fromEntries(["A","B","C"].map(id=>[id,api.instance(id)])),calibration:{},relations:{},events:[]};
}

function evaluate(r,x){return r.terms.reduce((s,t)=>s^Number((x&t)===t),r.bias);}

function advance(api,previous,s,provider,budget=BOUND){
 if(s.events.length>=MAX||!Number.isInteger(budget)||budget<0||budget>BOUND)throw Error("budget or episode limit");
 const d=previous.decide(s),next=copy(s),i=s.events.length,world="w"+(i+1),sender=i%2?"B":"A",trace=[],seen=new Map();
 const cost={source:0,recipient:0,calibration:0,total:0,completed:0,uncertain:0};
 let status="abstained",reason="no consistent certified rule",peerStatus="not-attempted",alignment="not-attempted",relation=null;
 function reserve(kind,n){if(cost.total+n>budget)throw new Stop("budget");cost[kind]+=n;cost.total+=n;}
 function query(actor,stage,x){
  reserve(actor==="C"?"recipient":"source",1);
  const t={kind:"observation",actor,stage,x,outcome:"error"};trace.push(t);
  let y;try{y=provider.observe(actor,world,stage,x);}catch{cost.uncertain++;throw new Stop("provider-observation");}
  if(y!==0&&y!==1){t.outcome="invalid";cost.uncertain++;throw new Stop("invalid-observation");}
  t.outcome="ok";t.y=y;cost.completed++;
  const key=actor+":"+x;if(seen.has(key)&&seen.get(key)!==y)throw new Stop("contradictory-observation");seen.set(key,y);return y;
 }
 function certificate(actor,r){if(r.status!=="accepted")return false;let valid=true;for(let x=0;x<32;x++)if(evaluate(r.rule,x)!==query(actor,"certificate",x))valid=false;return valid;}
 function calibrate(){
  reserve("calibration",10);const t={kind:"calibration",sender,outcome:"error"};trace.push(t);
  let pairs;try{pairs=provider.anchors(sender);}catch{cost.uncertain+=10;throw new Stop("provider-calibration");}
  try{api.calibrate(pairs);}catch{t.outcome="invalid";cost.uncertain+=10;throw new Stop("invalid-calibration");}
  t.outcome="ok";t.pairs=copy(pairs);cost.completed+=10;
  const old=next.calibration[sender];alignment=!old?"initial":JSON.stringify(api.calibrate(old))===JSON.stringify(api.calibrate(pairs))?"confirmed":"changed";
  next.calibration[sender]=copy(pairs);
 }
 function transport(offered){
  const t={kind:"packet",sender,offered,outcome:"error"};trace.push(t);let raw;
  try{raw=provider.transport(offered);}catch{throw new Stop("provider-transport");}
  if(typeof raw!=="string"||raw.length>512){t.outcome="invalid";throw new Stop("invalid-packet");}
  t.outcome="ok";t.received=raw;return raw;
 }
 try{
  let result=null,origin="local",target=copy(next.agents.C);
  if(d.method==="peer"){
   const src=copy(next.agents[sender]),learned=api.learn(src,world,x=>query(sender,"learn",x));
   if(certificate(sender,learned)){
    next.agents[sender]=src;calibrate();
    const raw=transport(api.packet(sender,world,learned.rule));
    const transfer=api.receive(target,raw,next.calibration[sender],x=>query("C","peer-audit",x),sender,world);peerStatus=transfer.status;
    if(transfer.status==="accepted"){result=transfer;origin=sender;}
   }else peerStatus="source-uncertified";
  }
  if(!result){result=api.learn(target,world,x=>query("C","learn",x),{useMemory:d.method!=="cold"});origin="local";}
  if(result.status==="accepted"){
   if(certificate("C",result)){
    status="accepted";reason="complete finite-domain certificate";
    relation={rule:copy(result.rule),origin,episode:i+1,method:d.method,classification:"certified",domainSize:32};
    next.agents.C=target;next.relations[world]=copy(relation);
   }else reason="certificate mismatch";
  }
 }catch(e){if(!(e instanceof Stop))throw e;status="aborted";reason=e.code;}
 const out=status==="accepted"?next:copy(s);
 out.events.push({world,method:d.method,reason:d.reason,status,detail:reason,peerStatus,alignment,relation,cost,budget,trace});
 return out;
}

function checkpoint(s){return JSON.stringify({schema:10,seed:s.seed,mode:s.mode,events:s.events});}

function restore(api,previous,raw){
 if(typeof raw!=="string"||raw.length>5000000)throw Error("checkpoint size");const d=JSON.parse(raw);
 if(d.schema!==10||!Array.isArray(d.events)||d.events.length>MAX)throw Error("checkpoint schema");
 let s=create(api,d.seed,d.mode);
 for(const e of d.events){
  if(!Array.isArray(e.trace)||e.trace.length>BOUND+4)throw Error("trace bound");
  let n=0;function take(kind){const t=e.trace[n++];if(!t||t.kind!==kind)throw Error("trace kind");return t;}
  s=advance(api,previous,s,{
   observe(actor,w,stage,x){const t=take("observation");if(t.actor!==actor||t.stage!==stage||t.x!==x||w!==e.world)throw Error("observation replay");if(t.outcome==="error")throw Error("recorded failure");if(t.outcome==="invalid")return 2;return t.y;},
   anchors(sender){const t=take("calibration");if(t.sender!==sender)throw Error("calibration replay");if(t.outcome==="error")throw Error("recorded failure");return t.outcome==="invalid"?[]:t.pairs;},
   transport(offered){const t=take("packet");if(t.offered!==offered)throw Error("packet replay");if(t.outcome==="error")throw Error("recorded failure");return t.outcome==="invalid"?null:t.received;}
  },e.budget);
  if(n!==e.trace.length||JSON.stringify(s.events.at(-1))!==JSON.stringify(e))throw Error("trace mismatch");
 }
 if(checkpoint(s)!==raw)throw Error("noncanonical");return s;
}

function rng(seed){let x=seed>>>0||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function perm(next){let a=[0,1,2,3,4];for(let i=4;i>0;i--){const j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

function oracle(r,x){return (r.bias+r.terms.reduce((s,t)=>s+Array.from({length:5},(_,i)=>i).filter(i=>Math.floor(t/2**i)%2).reduce((p,i)=>p*(Math.floor(x/2**i)%2),1),0))%2;}

function environment(seed,i,drift=true,corrupt=false){
 const next=rng((seed+Math.imul(i+1,0x4b1d3ac7))>>>0),coords=rng((seed^(drift&&i>=6?0x4ea85d17:0x6c8e9cf5))>>>0),maps=Object.fromEntries(["A","B","C"].map(id=>[id,perm(coords)])),terms=[3,5,6,9,10,12,17,18,20,24];
 const a=terms.splice(next()%terms.length,1)[0],b=terms[next()%terms.length],r={bias:next()&1,terms:[a,b].sort((a,b)=>a-b)};
 const truth=(actor,x)=>oracle(r,maps[actor].reduce((v,k,j)=>v+(Math.floor(x/2**k)%2)*2**j,0));
 return {truth,provider:{observe(actor,w,stage,x){return truth(actor,x);},anchors(sender){return maps[sender].map((k,j)=>[2**k,2**maps.C[j]]);},transport(raw){if(!corrupt)return raw;const p=JSON.parse(raw);p.rule.bias^=1;return JSON.stringify(p);}}};
}

function report(api,previous){
 const sessions=[],faults=[];
 for(const mode of MODES)for(let j=0;j<9;j++){
  const seed=(0x35e81241+j*131071)>>>0;let s=create(api,seed,mode),correct=0,full=0,cost=0,changed=0,rejected=0,replays=0;
  for(let i=0;i<12;i++){
   const e=environment(seed,i,true,i%5===0);s=advance(api,previous,s,e.provider);const a=s.events.at(-1);
   if(a.status==="accepted"){let matches=0;for(let x=0;x<32;x++)matches+=Number(evaluate(a.relation.rule,x)===e.truth("C",x));full+=matches;correct+=Number(matches===32);}
   cost+=a.cost.total;changed+=Number(a.alignment==="changed");rejected+=Number(a.peerStatus==="rejected");
   if(i===5){s=restore(api,previous,checkpoint(s));replays++;}
  }
  if(JSON.stringify(s)!==JSON.stringify(restore(api,previous,checkpoint(s))))throw Error("session replay");
  sessions.push({mode,seed,correct,full,cost,changed,rejected,replays});
 }
 for(let j=0;j<9;j++){
  const seed=(0x921d37b1+j*65537)>>>0,e=environment(seed,0),s=create(api,seed,"cold"),used=new Set([29,30,31]);
  api.learn(api.instance("C"),"w1",x=>{used.add(x);return e.truth("C",x);});
  const flip=Array.from({length:32},(_,x)=>x).find(x=>!used.has(x));
  if(flip===undefined)throw Error("no sparse witness");
  const sparse=advance(api,previous,s,{...e.provider,observe(actor,w,stage,x){return e.truth(actor,x)^Number(x===flip);}});
  const budget=advance(api,previous,s,e.provider,5);
  let calls=0;
  const external=advance(api,previous,s,{...e.provider,observe(...args){if(calls++>=5)throw Error("external");return e.provider.observe(...args);}});
  const contradict=advance(api,previous,s,{...e.provider,observe(actor,w,stage,x){return e.truth(actor,x)^Number(stage==="certificate");}});
  const all=[sparse,budget,external,contradict];
  faults.push({seed,flip,sparseRejected:sparse.events[0].status!=="accepted",budgetRecorded:budget.events[0].status==="aborted"&&budget.events[0].cost.total===5&&budget.events[0].cost.completed===5,externalRecorded:external.events[0].status==="aborted"&&external.events[0].cost.total===6&&external.events[0].cost.completed===5&&external.events[0].cost.uncertain===1,contradictionRejected:contradict.events[0].status!=="accepted",rollback:all.every(t=>!Object.keys(t.relations).length&&!t.agents.C.library.length),replays:all.every(t=>JSON.stringify(t)===JSON.stringify(restore(api,previous,checkpoint(t))))});
 }
 const modes=Object.fromEntries(MODES.map(m=>[m,Object.fromEntries(["correct","full","cost","changed","rejected","replays"].map(k=>[k,sessions.filter(t=>t.mode===m).reduce((n,t)=>n+t[k],0)]))]));
 return {modes,sessions,faults};
}

function checks(api,previous,r){
 const names=[];function test(n,c){if(!c)throw Error(n);names.push(n);}
 test("all supported rules certified",r.sessions.every(x=>x.correct===12&&x.full===384));
 test("sparse witnesses rejected",r.faults.every(x=>x.sparseRejected));
 test("internal budget accounted",r.faults.every(x=>x.budgetRecorded));
 test("external failure accounted",r.faults.every(x=>x.externalRecorded));
 test("contradictions rejected",r.faults.every(x=>x.contradictionRejected));
 test("no failed admission",r.faults.every(x=>x.rollback));
 test("failed event replay",r.faults.every(x=>x.replays));
 test("coordinate changes repaired",r.modes.peer.changed===18);
 test("peer packet rejection",r.modes.peer.rejected===27);
 test("session replay",r.sessions.every(x=>x.replays===1));
 let s=create(api,2,"cold"),t=advance(api,previous,s,environment(2,0).provider,0);
 test("zero budget recorded without work",t.events[0].status==="aborted"&&t.events[0].cost.total===0&&!t.events[0].trace.length);
 const d=JSON.parse(checkpoint(t));d.events[0].cost.total=1;let fail=false;try{restore(api,previous,JSON.stringify(d));}catch{fail=true;}
 test("derived record mutation rejected",fail);
 return names;
}
export {create,advance,checkpoint,restore,environment,report,checks,peerAPI,previous};
