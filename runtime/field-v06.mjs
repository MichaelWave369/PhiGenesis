// Genesis Field v0.6 — temporal relevance, finite strategy selection.
import * as peerAPI from "./field-v03.mjs";
import * as previous from "./field-v05.mjs";
const METHODS=["cold","memory","peer"],POLICIES=["v05","decay","probe","combined"],STREAMS=["stationary","abrupt","alternating"],ROUNDS=144,HALF_LIFE=12,PROBE_GAP=12,MAX_ROUNDS=360,EPSILON=0.12;
function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function shuffle(a,next){a=[...a];for(let i=a.length-1;i>0;i--){const j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

function probability(stream,i){if(stream==="stationary")return 0.1;if(stream==="abrupt")return i<48?.05:i<96?.9:.1;if(stream==="alternating")return Math.floor(i/24)%2?.8:.05;throw Error("stream");}

function world(seed,i,stream){
 const next=rng((seed+Math.imul(i+1,0x6c8e9cf5))>>>0||1),pa=shuffle([0,1,2,3,4],next),pc=shuffle([0,1,2,3,4],next),terms=[3,5,6,9,10,12,17,18,20,24],pairs=[];
 for(let j=0;j<terms.length;j++)for(let k=j+1;k<terms.length;k++)pairs.push([terms[j],terms[k]]);
 const p=probability(stream,i);
 const tasks=shuffle(pairs,next).slice(0,4).map(terms=>({truth:{bias:next()&1,terms},corrupt:next()/2**32<p}));
 return {pa,pc,tasks};
}

function create(seed,policy){
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff||!POLICIES.slice(1).includes(policy))throw Error("invalid configuration");
 return {schema:6,seed,policy,events:[],pending:null};
}

function estimate(s,m){
 const i=s.events.length,rows=s.events.map((e,t)=>({...e,t})).filter(e=>e.method===m);
 if(!rows.length)return null;
 const decay=s.policy!=="probe",selected=decay?rows:rows.slice(-12);
 let w=0,v=0;
 for(const e of selected){const weight=decay?2**(-(i-1-e.t)/HALF_LIFE):1;w+=weight;v+=weight*e.cost;}
 // Weak fixed prior prevents a stale arm from retaining arbitrarily precise estimates.
 const prior=decay?.5:0,mean=(v+prior*90)/(w+prior);
 return {mean,effectiveWeight:w,age:i-rows.at(-1).t,n:rows.length};
}

function select(s){
 if(s.pending)return s.pending;
 const i=s.events.length;if(i>=MAX_ROUNDS)throw Error("round limit");
 const estimates=METHODS.map(m=>estimate(s,m));let j=estimates.findIndex(v=>v===null),reason="initial";
 if(j<0){
  const overdue=estimates.map((e,k)=>({k,age:e.age})).filter(e=>e.age>=PROBE_GAP).sort((a,b)=>b.age-a.age||a.k-b.k);
  if(s.policy!=="decay"&&overdue.length){j=overdue[0].k;reason="probe";}
  else {const next=rng((s.seed^Math.imul(i+1,0x85ebca6b))>>>0||1);if(next()/2**32<EPSILON){j=next()%3;reason="random";}else{j=estimates.reduce((a,b,k)=>b.mean<estimates[a].mean?k:a,0);reason="exploit";}}
 }
 return s.pending={method:METHODS[j],reason,estimates};
}

function observe(s,outcome){
 if(!s.pending||!outcome||!Number.isInteger(outcome.cost)||outcome.cost<0||outcome.cost>202||!Number.isInteger(outcome.source)||outcome.source<0||outcome.source>192||!Number.isInteger(outcome.exact)||outcome.exact<0||outcome.exact>4||!Number.isInteger(outcome.heldout)||outcome.heldout<0||outcome.heldout>12||!Number.isInteger(outcome.rejected)||outcome.rejected<0||outcome.rejected>4)throw Error("invalid outcome");
 if(s.pending.method!=="peer"&&(outcome.source||outcome.rejected))throw Error("invalid local outcome");
 s.events.push({method:s.pending.method,reason:s.pending.reason,cost:outcome.cost,source:outcome.source,exact:outcome.exact,heldout:outcome.heldout,rejected:outcome.rejected});s.pending=null;
}

function checkpoint(s){return JSON.stringify({schema:6,seed:s.seed,policy:s.policy,events:s.events,pending:s.pending!==null});}

function restore(raw){
 if(typeof raw!=="string"||raw.length>1000000)throw Error("checkpoint size");const d=JSON.parse(raw);
 if(d.schema!==6||!Array.isArray(d.events)||d.events.length>MAX_ROUNDS||typeof d.pending!=="boolean")throw Error("checkpoint schema");
 const s=create(d.seed,d.policy);
 for(const e of d.events){const p=select(s);if(p.method!==e.method||p.reason!==e.reason)throw Error("decision mismatch");observe(s,e);}
 if(d.pending)select(s);if(checkpoint(s)!==raw)throw Error("noncanonical");return s;
}

function trial(api,old,seed,stream,rounds=ROUNDS){
 if(!STREAMS.includes(stream)||!Number.isInteger(rounds)||rounds<1||rounds>MAX_ROUNDS)throw Error("trial bounds");
 let states=Object.fromEntries(POLICIES.map(p=>[p,p==="v05"?old.create(seed):create(seed,p)]));
 const total=Object.fromEntries([...METHODS,...POLICIES,"hindsight"].map(m=>[m,0])),sources=Object.fromEntries(POLICIES.map(p=>[p,0])),choices=Object.fromEntries(POLICIES.map(p=>[p,Object.fromEntries(METHODS.map(m=>[m,0]))])),probes=Object.fromEntries(POLICIES.map(p=>[p,0]));
 const phases=[],replay={decay:0,probe:0,combined:0};let exact=0,heldout=0;
 for(let i=0;i<rounds;i++){
  const task=world(seed,i,stream),decisions=Object.fromEntries(POLICIES.map(p=>[p,p==="v05"?old.select(states[p]):select(states[p])]));
  if(i===Math.floor(rounds/2))for(const p of POLICIES.slice(1)){states[p]=restore(checkpoint(states[p]));replay[p]++;}
  // Decisions are frozen before outcomes exist; execute each distinct chosen arm once,
  // and expose only its own result to each selector. Other arms are evaluator-only.
  const outcomes={};
  for(const p of POLICIES){const d=decisions[p],m=d.method;outcomes[m]??=old.execute(api,task,m);const r=outcomes[m];if(p==="v05")old.observe(states[p],r);else observe(states[p],r);}
  for(const m of METHODS)outcomes[m]??=old.execute(api,task,m);
  const phase=Math.floor(i/(stream==="alternating"?24:48));
  const ph=phases[phase]??={rounds:0,total:Object.fromEntries([...METHODS,...POLICIES,"hindsight"].map(m=>[m,0])),peerChoices:Object.fromEntries(POLICIES.map(p=>[p,0]))};ph.rounds++;
  for(const m of METHODS){const r=outcomes[m];if(r.exact!==4||r.heldout!==12)throw Error("incorrect mathematical result");total[m]+=r.cost;ph.total[m]+=r.cost;}
  const best=Math.min(...METHODS.map(m=>outcomes[m].cost));total.hindsight+=best;ph.total.hindsight+=best;
  for(const p of POLICIES){const d=decisions[p],r=outcomes[d.method];total[p]+=r.cost;ph.total[p]+=r.cost;sources[p]+=r.source;choices[p][d.method]++;probes[p]+=Number(d.reason==="probe");ph.peerChoices[p]+=Number(d.method==="peer");exact+=r.exact;heldout+=r.heldout;}
 }
 for(const p of POLICIES.slice(1))if(checkpoint(restore(checkpoint(states[p])))!==checkpoint(states[p]))throw Error("final replay");
 return {seed,stream,rounds,total,sources,choices,probes,phases,replay,exact,heldout};
}

function report(api,old,seeds=12,rounds=ROUNDS){
 if(!Number.isInteger(seeds)||seeds<1||seeds>30)throw Error("seed bound");
 const result={seeds,rounds,halfLife:HALF_LIFE,probeGap:PROBE_GAP,epsilon:EPSILON,streams:{}};
 for(const stream of STREAMS){
  const trials=Array.from({length:seeds},(_,i)=>trial(api,old,(0x72ef920d+i*65537)>>>0,stream,rounds));
  const total=Object.fromEntries(Object.keys(trials[0].total).map(k=>[k,trials.reduce((s,t)=>s+t.total[k],0)])),sources=Object.fromEntries(POLICIES.map(p=>[p,trials.reduce((s,t)=>s+t.sources[p],0)])),probes=Object.fromEntries(POLICIES.map(p=>[p,trials.reduce((s,t)=>s+t.probes[p],0)]));
  const phases=trials[0].phases.map((_,i)=>({rounds:trials.reduce((s,t)=>s+t.phases[i].rounds,0),total:Object.fromEntries(Object.keys(total).map(k=>[k,trials.reduce((s,t)=>s+t.phases[i].total[k],0)])),peerChoices:Object.fromEntries(POLICIES.map(p=>[p,trials.reduce((s,t)=>s+t.phases[i].peerChoices[p],0)]))}));
  result.streams[stream]={total,sources,probes,phases,exact:trials.reduce((s,t)=>s+t.exact,0),heldout:trials.reduce((s,t)=>s+t.heldout,0),replays:trials.reduce((s,t)=>s+Object.values(t.replay).reduce((a,b)=>a+b,0),0),trials};
 }
 return result;
}

function checks(api,old,result){
 const names=[];function test(n,f){f();names.push(n);}function assert(c,m){if(!c)throw Error(m);}
 const outcome=cost=>({cost,source:0,exact:4,heldout:12,rejected:0});
 test("initial exploration and selected-only evidence",()=>{const s=create(1,"combined");for(const m of METHODS){assert(select(s).method===m,"initial");observe(s,outcome(80));}assert(s.events.length===3,"events");});
 test("elapsed-time decay",()=>{const s=create(2,"decay");s.events=[{method:"peer",cost:150}];const a=estimate(s,"peer");s.events.push(...Array.from({length:24},()=>({method:"cold",cost:80})));const b=estimate(s,"peer");assert(b.effectiveWeight<a.effectiveWeight&&b.mean<a.mean&&b.age>a.age,"decay");});
 test("overdue probe",()=>{const s=create(2,"combined");s.events=[{method:"peer",cost:150},{method:"memory",cost:100},...Array.from({length:12},()=>({method:"cold",cost:80}))];assert(select(s).method==="peer"&&s.pending.reason==="probe","probe");});
 test("pending checkpoint replay",()=>{const s=create(12,"combined");select(s);observe(s,outcome(80));select(s);assert(JSON.stringify(s)===JSON.stringify(restore(checkpoint(s))),"pending");});
 test("invalid outcome leaves history unchanged",()=>{const s=create(1,"decay");select(s);let fail=false;try{observe(s,outcome(-1));}catch{fail=true;}assert(fail&&!s.events.length,"invalid");});
 test("tampered decision rejected",()=>{const s=create(1,"probe");select(s);observe(s,outcome(80));const d=JSON.parse(checkpoint(s));d.events[0].method="peer";let fail=false;try{restore(JSON.stringify(d));}catch{fail=true;}assert(fail,"tamper");});
 test("all mathematical outcomes and costs",()=>{for(const r of Object.values(result.streams)){assert(r.exact===result.seeds*result.rounds*4*4&&r.heldout===r.exact*3,"exact");assert(r.replays===result.seeds*3,"restart");for(const p of POLICIES){assert(r.total[p]>=r.total.hindsight&&r.phases.reduce((a,b)=>a+b.total[p],0)===r.total[p],"cost");}}});
 test("deterministic trial",()=>assert(JSON.stringify(trial(api,old,17,"alternating",9))===JSON.stringify(trial(api,old,17,"alternating",9)),"determinism"));
 test("bounds",()=>{let fail=false;try{create(0,"decay");}catch{fail=true;}assert(fail,"bound");});
 return names;
}
export {create,select,observe,checkpoint,restore,world,trial,report,checks,peerAPI,previous};
