// Genesis Field v0.8 — integrated bounded event-sourced runtime.
import * as peerAPI from "./field-v03.mjs";
const METHODS=["cold","memory","peer"],MODES=["adaptive","cold","memory","peer"],MAX=144,BOUND=128,TEST=[29,30,31];
function clone(v){return JSON.parse(JSON.stringify(v));}

function rng(seed){let x=seed>>>0||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function shuffle(a,next){a=[...a];for(let i=a.length-1;i>0;i--){const j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

function mask(x,p){let r=0;for(let i=0;i<5;i++)if(x&(1<<i))r|=1<<p[i];return r;}

function inverse(p){return Array.from({length:5},(_,i)=>p.indexOf(i));}

function oracle(r,x){return (r.bias+r.terms.reduce((s,t)=>s+Array.from({length:5},(_,i)=>i).filter(i=>Math.floor(t/2**i)%2).reduce((v,i)=>v*(Math.floor(x/2**i)%2),1),0))%2;}

function evaluate(r,x){return r.terms.reduce((s,t)=>s^Number((t&x)===t),r.bias);}

function create(api,seed,mode="adaptive"){
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff||!MODES.includes(mode))throw Error("configuration");
 return {schema:8,seed,mode,agents:Object.fromEntries(["A","B","C"].map(id=>[id,api.instance(id)])),calibration:{},relations:{},events:[]};
}

function decide(s){
 if(s.events.length>=MAX)throw Error("episode limit");
 const i=s.events.length;
 const estimates=METHODS.map(method=>{const rows=s.events.map((e,t)=>({e,t})).filter(x=>x.e.method===method);let w=.5,v=15;for(const {e,t} of rows){const q=2**(-(i-1-t)/12);w+=q;v+=q*(e.cost.total+(e.status==="accepted"?0:BOUND));}return {method,mean:v/w,weight:w,n:rows.length,age:rows.length?i-rows.at(-1).t:null};});
 if(s.mode!=="adaptive")return {method:s.mode,reason:"fixed",estimates};
 let j=estimates.findIndex(e=>!e.n),reason="initial";
 if(j<0){
  j=estimates.reduce((a,b,k)=>b.mean<estimates[a].mean?k:a,0);reason="exploit";
  const used=s.events.filter(e=>e.reason==="probe").length;
  if(used<Math.floor(i/6)){
   const scores=estimates.map((e,k)=>{const other=Math.min(...estimates.filter((_,l)=>l!==k).map(x=>x.mean));const spread=20*Math.sqrt(1+1/e.weight);const low=(e.weight*e.mean+Math.max(0,e.mean-spread))/(e.weight+1),high=(e.weight*e.mean+Math.min(256,e.mean+spread))/(e.weight+1);return 12*Math.max(0,Math.min(e.mean,other)-(Math.min(low,other)+Math.min(high,other))/2)-Math.max(0,e.mean-estimates[j].mean);});
   const k=scores.reduce((a,b,l)=>l!==j&&(a===j||b>scores[a])?l:a,j);if(k!==j&&scores[k]>0){j=k;reason="probe";}
  }
 }
 return {method:METHODS[j],reason,estimates};
}

function advance(api,s,provider){
 const decision=decide(s),next=clone(s),i=s.events.length,world="w"+(i+1),sender=i%2?"B":"A",trace=[],cost={source:0,recipient:0,calibration:0,total:0,wireBytes:0};
 const query=(actor,stage,x)=>{
  if(cost.total>=BOUND||!Number.isInteger(x)||x<0||x>31)throw Error("observation budget");
  const y=provider.observe(actor,world,stage,x);if(y!==0&&y!==1)throw Error("invalid observation");
  trace.push({kind:"observation",actor,stage,x,y});cost[actor==="C"?"recipient":"source"]++;cost.total++;return y;
 };
 const verify=(actor,result)=>{if(result.status!=="accepted")return false;let valid=true;for(const x of TEST){if(evaluate(result.rule,x)!==query(actor,"test",x))valid=false;}return valid;};
 let target=clone(next.agents.C),result=null,origin="local",peerStatus="not-attempted";
 if(decision.method==="peer"){
  let source=clone(next.agents[sender]);const learned=api.learn(source,world,x=>query(sender,"learn",x));
  if(verify(sender,learned)){
   next.agents[sender]=source;
   if(!next.calibration[sender]){
    if(cost.total+10>BOUND)throw Error("calibration budget");
    const pairs=provider.anchors(sender);api.calibrate(pairs);next.calibration[sender]=clone(pairs);trace.push({kind:"calibration",sender,pairs:clone(pairs)});cost.calibration+=10;cost.total+=10;cost.wireBytes+=JSON.stringify(pairs).length;
   }
   const offered=api.packet(sender,world,learned.rule),received=provider.transport(offered);
   if(typeof received!=="string"||received.length>512)throw Error("packet bound");
   trace.push({kind:"packet",sender,offered,received});cost.wireBytes+=received.length;
   const transfer=api.receive(target,received,next.calibration[sender],x=>query("C","peer-audit",x),sender,world);
   peerStatus=transfer.status;
   if(transfer.status==="accepted"){result=transfer;origin=sender;}
  }else peerStatus="source-unverified";
 }
 if(!result){result=api.learn(target,world,x=>query("C","learn",x),{useMemory:decision.method!=="cold"});origin="local";}
 const accepted=verify("C",result);
 if(accepted){
  next.agents.C=target;next.relations[world]={rule:clone(result.rule),origin,episode:i+1,method:decision.method};
 }
 const event={world,method:decision.method,reason:decision.reason,status:accepted?"accepted":"abstained",peerStatus,relation:accepted?clone(next.relations[world]):null,cost,trace};
 next.events.push(event);return next;
}

function checkpoint(s){return JSON.stringify({schema:8,seed:s.seed,mode:s.mode,events:s.events});}

function restore(api,raw){
 if(typeof raw!=="string"||raw.length>4000000)throw Error("checkpoint size");const d=JSON.parse(raw);
 if(d.schema!==8||!Array.isArray(d.events)||d.events.length>MAX)throw Error("checkpoint schema");
 let s=create(api,d.seed,d.mode);
 for(const e of d.events){
  if(!Array.isArray(e.trace)||e.trace.length>BOUND+4)throw Error("trace bound");
  let n=0;function take(kind){const t=e.trace[n++];if(!t||t.kind!==kind)throw Error("trace kind");return t;}
  s=advance(api,s,{observe(actor,world,stage,x){const t=take("observation");if(t.actor!==actor||t.stage!==stage||t.x!==x||world!==e.world)throw Error("trace observation");return t.y;},anchors(sender){const t=take("calibration");if(t.sender!==sender)throw Error("trace sender");return t.pairs;},transport(offered){const t=take("packet");if(t.offered!==offered)throw Error("trace packet");return t.received;}});
  if(n!==e.trace.length||JSON.stringify(s.events.at(-1))!==JSON.stringify(e))throw Error("trace mismatch");
 }
 if(checkpoint(s)!==raw)throw Error("noncanonical");return s;
}

function environment(seed,index,corrupt=false){
 const next=rng(seed),p=Object.fromEntries(["A","B","C"].map(id=>[id,shuffle([0,1,2,3,4],next)])),r=rng((seed+Math.imul(index+1,0x9e3779b9))>>>0),terms=shuffle([3,5,6,9,10,12,17,18,20,24],r);
 const truth={bias:r()&1,terms:terms.slice(0,2).sort((a,b)=>a-b)};
 return {truth,p,provider:{observe(actor,world,stage,x){return oracle(truth,mask(x,inverse(p[actor])));},anchors(sender){return Array.from({length:5},(_,i)=>[1<<p[sender][i],1<<p.C[i]]);},transport(raw){if(!corrupt)return raw;const packet=JSON.parse(raw);packet.rule.bias^=1;return JSON.stringify(packet);}}};
}

function trial(api,seed,mode,rounds=36){
 let s=create(api,seed,mode),exact=0,full=0,source=0,recipient=0,calibration=0,wire=0,rejected=0,replays=0,choices={cold:0,memory:0,peer:0},probes=0;
 for(let i=0;i<rounds;i++){
  const e=environment(seed,i,i%7===0);s=advance(api,s,e.provider);const last=s.events.at(-1);
  if(last.status==="accepted"){
   const expected=api.translate(e.truth,e.p.C);exact+=Number(JSON.stringify(last.relation.rule)===JSON.stringify(expected));
   for(let x=0;x<32;x++)full+=Number(evaluate(last.relation.rule,x)===oracle(e.truth,mask(x,inverse(e.p.C))));
  }
  source+=last.cost.source;recipient+=last.cost.recipient;calibration+=last.cost.calibration;wire+=last.cost.wireBytes;choices[last.method]++;probes+=Number(last.reason==="probe");rejected+=Number(last.peerStatus==="rejected");
  if(i===Math.floor(rounds/2)){const t=restore(api,checkpoint(s));if(JSON.stringify(t)!==JSON.stringify(s))throw Error("restart");s=t;replays++;}
 }
 if(JSON.stringify(restore(api,checkpoint(s)))!==JSON.stringify(s))throw Error("final replay");
 return {seed,mode,rounds,exact,full,source,recipient,calibration,total:source+recipient+calibration,wire,rejected,replays,choices,probes,relationCount:Object.keys(s.relations).length,librarySize:s.agents.C.library.length};
}

function report(api,seeds=9,rounds=36){
 if(!Number.isInteger(seeds)||seeds<1||seeds>18||!Number.isInteger(rounds)||rounds<3||rounds>MAX)throw Error("report bounds");
 const trials=MODES.flatMap(mode=>Array.from({length:seeds},(_,i)=>trial(api,(0x6fe28913+i*65537)>>>0,mode,rounds)));
 const modes={};for(const mode of MODES){const rs=trials.filter(t=>t.mode===mode),sum=k=>rs.reduce((s,t)=>s+t[k],0);modes[mode]={...Object.fromEntries(["exact","full","source","recipient","calibration","total","wire","rejected","replays","probes","relationCount"].map(k=>[k,sum(k)])),choices:Object.fromEntries(METHODS.map(m=>[m,rs.reduce((s,t)=>s+t.choices[m],0)]))};}
 return {seeds,rounds,modes,trials};
}

function checks(api,r){
 const names=[];const assert=(c,m)=>{if(!c)throw Error(m);};const test=(n,f)=>{f();names.push(n);};
 test("three independent agents",()=>{const s=create(api,1);s.agents.A.library.push(3);assert(!s.agents.B.library.length&&!s.agents.C.library.length,"alias");});
 test("adaptive initial exploration",()=>{let s=create(api,2);for(const m of METHODS){assert(decide(s).method===m,"initial");s=advance(api,s,environment(2,s.events.length).provider);}});
 test("source and receiver evidence replay",()=>{let s=create(api,3,"peer");s=advance(api,s,environment(3,0).provider);assert(s.events[0].relation.origin==="A"&&JSON.stringify(restore(api,checkpoint(s)))===JSON.stringify(s),"replay");});
 test("corrupt transfer rejected and fallback verified",()=>{let s=create(api,4,"peer");s=advance(api,s,environment(4,0,true).provider);assert(s.events[0].peerStatus==="rejected"&&s.events[0].status==="accepted"&&s.relations.w1.origin==="local","corruption");});
 test("calibration reused across episodes",()=>{let s=create(api,5,"peer");for(let i=0;i<3;i++)s=advance(api,s,environment(5,i).provider);assert(s.events.map(e=>e.cost.calibration).join(",")==="10,10,0","calibration");});
 test("invalid observation atomic",()=>{const s=create(api,6,"cold"),raw=checkpoint(s);let fail=false;try{advance(api,s,{observe:()=>2});}catch{fail=true;}assert(fail&&checkpoint(s)===raw&&!s.agents.C.library.length,"atomic");});
 test("held-out contradiction not admitted",()=>{const s=create(api,7,"cold"),p=environment(7,0).provider;const t=advance(api,s,{...p,observe(actor,w,stage,x){return p.observe(actor,w,stage,x)^Number(stage==="test");}});assert(t.events[0].status==="abstained"&&!t.agents.C.library.length&&!t.relations.w1,"admission");});
 test("tampered derived record rejected",()=>{const s=advance(api,create(api,8,"cold"),environment(8,0).provider),d=JSON.parse(checkpoint(s));d.events[0].cost.total++;let fail=false;try{restore(api,JSON.stringify(d));}catch{fail=true;}assert(fail,"tamper");});
 test("no uncharged observations",()=>{let s=create(api,9,"peer");s=advance(api,s,environment(9,0).provider);const e=s.events[0];assert(e.cost.total===e.trace.filter(t=>t.kind==="observation").length+10&&e.cost.total<=BOUND,"cost");});
 test("benchmark correctness and accounting",()=>{for(const m of MODES){const t=r.modes[m];assert(t.exact===r.seeds*r.rounds&&t.full===t.exact*32&&t.total===t.source+t.recipient+t.calibration&&t.replays===r.seeds,"benchmark");}});
 test("deterministic trial",()=>assert(JSON.stringify(trial(api,11,"adaptive",9))===JSON.stringify(trial(api,11,"adaptive",9)),"determinism"));
 test("bounds",()=>{let fail=false;try{create(api,0);}catch{fail=true;}assert(fail,"bound");});
 return names;
}
export {create,decide,advance,checkpoint,restore,environment,trial,report,checks,peerAPI};
