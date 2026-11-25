// Genesis Field v0.7 — bounded value-of-information proxy.
import * as peerAPI from "./field-v03.mjs";
import * as previous from "./field-v05.mjs";
import * as v06 from "./field-v06.mjs";
const METHODS=["cold","memory","peer"],POLICIES=["greedy","random","periodic","curiosity"],STREAMS=["stable","abrupt","gradual","bursts"],ROUNDS=144,MAX_ROUNDS=144,HALF=12,PROBE_CAP=24,SPACING=6,HORIZON=12;
function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function shuffle(a,next){a=[...a];for(let i=a.length-1;i>0;i--){const j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

function probability(stream,i){if(stream==="stable")return .15;if(stream==="abrupt")return i<36?.08:i<84?.92:.08;if(stream==="gradual")return .05+.85*(1-Math.abs(i-72)/72);if(stream==="bursts")return (i%36>=12&&i%36<24)?.9:.08;throw Error("stream");}

function world(seed,i,stream){
 const next=rng((seed+Math.imul(i+1,0x4f1bbcdc))>>>0||1),pa=shuffle([0,1,2,3,4],next),pc=shuffle([0,1,2,3,4],next),terms=[3,5,6,9,10,12,17,18,20,24],pairs=[];
 for(let j=0;j<terms.length;j++)for(let k=j+1;k<terms.length;k++)pairs.push([terms[j],terms[k]]);
 const p=probability(stream,i);
 return {pa,pc,tasks:shuffle(pairs,next).slice(0,4).map(terms=>({truth:{bias:next()&1,terms},corrupt:next()/2**32<p}))};
}

function create(seed,policy){if(!Number.isInteger(seed)||seed<1||seed>0xffffffff||!POLICIES.includes(policy))throw Error("configuration");return {schema:7,seed,policy,events:[],pending:null};}

function estimates(s){
 const i=s.events.length;
 return METHODS.map(method=>{
  const rows=s.events.map((e,t)=>({...e,t})).filter(e=>e.method===method);if(!rows.length)return null;
  let w=.5,sum=45;
  for(const e of rows){const a=2**(-(i-1-e.t)/HALF);w+=a;sum+=a*e.cost;}
  const mean=sum/w,age=i-rows.at(-1).t;
  // Two-point predictive proxy: fixed scales chosen before benchmark, not calibrated intervals.
  const scale=method==="peer"?25:12,spread=scale*Math.sqrt(1+1/w);
  return {method,mean,w,age,spread};
 });
}

function valueOfProbe(estimate,bestOther,bestMean){
 const {mean,w,spread}=estimate;
 const updated=[Math.max(0,mean-spread),Math.min(202,mean+spread)].map(y=>(w*mean+y)/(w+1));
 const expected=Math.min(mean,bestOther)-updated.reduce((s,y)=>s+Math.min(y,bestOther)/2,0);
 return {gain:Math.max(0,expected),score:HORIZON*Math.max(0,expected)-Math.max(0,mean-bestMean)};
}

function select(s){
 if(s.pending)return s.pending;const i=s.events.length;if(i>=MAX_ROUNDS)throw Error("round limit");
 const es=estimates(s);let idx=es.findIndex(e=>e===null),reason="initial",scores=null;
 if(idx<0){
  idx=es.reduce((a,b,j)=>b.mean<es[a].mean?j:a,0);reason="exploit";
  const used=s.events.filter(e=>e.reason==="probe").length;
  // Initial 3 are separately charged. At most 23 additional probes over 144 batches.
  const available=used<Math.min(PROBE_CAP,Math.floor(i/SPACING));
  const alternatives=es.map((e,j)=>({j,...valueOfProbe(e,Math.min(...es.filter((_,k)=>k!==j).map(x=>x.mean)),es[idx].mean)})).filter(e=>e.j!==idx);
  scores=alternatives.map(x=>({method:METHODS[x.j],gain:x.gain,score:x.score}));
  if(available&&s.policy==="curiosity"){
   const best=alternatives.reduce((a,b)=>b.score>a.score?b:a);
   if(best.score>0){idx=best.j;reason="probe";}
  }else if(available&&s.policy!=="greedy"&&s.policy!=="curiosity"&&i%SPACING===0){
   if(s.policy==="periodic")idx=alternatives.reduce((a,b)=>es[b.j].age>es[a.j].age?b:a).j;
   else idx=alternatives[rng((s.seed^Math.imul(i+1,0x85ebca6b))>>>0||1)()%alternatives.length].j;
   reason="probe";
  }
 }
 return s.pending={method:METHODS[idx],reason,estimates:es,scores};
}

function observe(s,r){
 if(!s.pending||!r||!Number.isInteger(r.cost)||r.cost<0||r.cost>202||!Number.isInteger(r.source)||r.source<0||r.source>192||r.exact!==4||r.heldout!==12||!Number.isInteger(r.rejected)||r.rejected<0||r.rejected>4)throw Error("invalid or unverified outcome");
 if(s.pending.method!=="peer"&&(r.source||r.rejected))throw Error("invalid local outcome");
 s.events.push({method:s.pending.method,reason:s.pending.reason,cost:r.cost,source:r.source,exact:r.exact,heldout:r.heldout,rejected:r.rejected});s.pending=null;
}

function checkpoint(s){return JSON.stringify({schema:7,seed:s.seed,policy:s.policy,events:s.events,pending:!!s.pending});}

function restore(raw){if(typeof raw!=="string"||raw.length>1e6)throw Error("size");const d=JSON.parse(raw);if(d.schema!==7||!Array.isArray(d.events)||d.events.length>MAX_ROUNDS||typeof d.pending!=="boolean")throw Error("schema");const s=create(d.seed,d.policy);for(const e of d.events){const p=select(s);if(p.method!==e.method||p.reason!==e.reason)throw Error("decision");observe(s,e);}if(d.pending)select(s);if(checkpoint(s)!==raw)throw Error("canonical");return s;}

function trial(api,old,v6,seed,stream,rounds=ROUNDS){
 if(!STREAMS.includes(stream)||!Number.isInteger(rounds)||rounds<1||rounds>MAX_ROUNDS)throw Error("trial");
 const policies=[...POLICIES,"v06"],states=Object.fromEntries(policies.map(p=>[p,p==="v06"?v6.create(seed,"combined"):create(seed,p)]));
 const cost=Object.fromEntries([...METHODS,...policies,"hindsight"].map(m=>[m,0])),source=Object.fromEntries([...METHODS,...policies].map(m=>[m,0])),probes=Object.fromEntries(policies.map(p=>[p,0])),choices=Object.fromEntries(policies.map(p=>[p,{cold:0,memory:0,peer:0}])),phases=[];let exact=0,heldout=0,replays=0;
 for(let i=0;i<rounds;i++){
  const task=world(seed,i,stream),ds=Object.fromEntries(policies.map(p=>[p,p==="v06"?v6.select(states[p]):select(states[p])]));
  if(i===Math.floor(rounds/2))for(const p of POLICIES){states[p]=restore(checkpoint(states[p]));replays++;}
  const outcomes={};
  for(const p of policies){const d=ds[p];outcomes[d.method]??=old.execute(api,task,d.method);if(p==="v06")v6.observe(states[p],outcomes[d.method]);else observe(states[p],outcomes[d.method]);}
  for(const m of METHODS)outcomes[m]??=old.execute(api,task,m);
  const j=Math.floor(i/12),ph=phases[j]??={cost:Object.fromEntries(Object.keys(cost).map(k=>[k,0])),peerChoices:Object.fromEntries(policies.map(p=>[p,0]))};
  for(const m of METHODS){const r=outcomes[m];if(r.exact!==4||r.heldout!==12)throw Error("oracle");cost[m]+=r.cost;source[m]+=r.source;ph.cost[m]+=r.cost;}
  const h=Math.min(...METHODS.map(m=>outcomes[m].cost));cost.hindsight+=h;ph.cost.hindsight+=h;
  for(const p of policies){const d=ds[p],r=outcomes[d.method];cost[p]+=r.cost;source[p]+=r.source;ph.cost[p]+=r.cost;ph.peerChoices[p]+=Number(d.method==="peer");choices[p][d.method]++;probes[p]+=Number(d.reason==="probe");exact+=r.exact;heldout+=r.heldout;}
 }
 for(const p of POLICIES){if(probes[p]>PROBE_CAP||checkpoint(restore(checkpoint(states[p])))!==checkpoint(states[p]))throw Error("budget/replay");}
 return {seed,stream,rounds,cost,source,probes,choices,phases,exact,heldout,replays};
}

function report(api,old,v6,seeds=9,rounds=ROUNDS){
 if(!Number.isInteger(seeds)||seeds<1||seeds>18)throw Error("seeds");
 const result={seeds,rounds,probeCap:PROBE_CAP,spacing:SPACING,halfLife:HALF,horizon:HORIZON,streams:{}};
 for(const stream of STREAMS){
  const trials=Array.from({length:seeds},(_,i)=>trial(api,old,v6,(0x51f183a7+i*131071)>>>0,stream,rounds));
  const aggregate=k=>Object.fromEntries(Object.keys(trials[0][k]).map(m=>[m,trials.reduce((s,t)=>s+t[k][m],0)]));
  const cost=aggregate("cost"),source=aggregate("source"),probes=aggregate("probes");
  const phases=trials[0].phases.map((_,i)=>({cost:Object.fromEntries(Object.keys(cost).map(m=>[m,trials.reduce((s,t)=>s+t.phases[i].cost[m],0)])),peerChoices:Object.fromEntries(Object.keys(trials[0].phases[i].peerChoices).map(m=>[m,trials.reduce((s,t)=>s+t.phases[i].peerChoices[m],0)]))}));
  result.streams[stream]={cost,source,fullyCharged:Object.fromEntries(Object.keys(source).map(m=>[m,cost[m]+source[m]])),probes,phases,exact:trials.reduce((s,t)=>s+t.exact,0),heldout:trials.reduce((s,t)=>s+t.heldout,0),replays:trials.reduce((s,t)=>s+t.replays,0),trials};
 }return result;
}

function checks(api,old,v6,result){
 const names=[];function test(n,f){f();names.push(n);}function assert(x,m){if(!x)throw Error(m);}
 const o=cost=>({cost,source:0,exact:4,heldout:12,rejected:0});
 test("initial exploration",()=>{const s=create(1,"curiosity");for(const m of METHODS){assert(select(s).method===m,"initial");observe(s,o(80));}});
 test("selected only",()=>{const s=create(1,"curiosity");select(s);observe(s,o(80));assert(estimates(s).filter(Boolean).length===1,"leak");});
 test("positive value near decision boundary",()=>{const v=valueOfProbe({mean:90,w:1,spread:30},89,89);assert(v.gain>0&&v.score>0,"value");});
 test("low value far from boundary",()=>assert(valueOfProbe({mean:140,w:3,spread:12},80,80).score<0,"value"));
 test("checkpoint and invalid outcomes",()=>{const s=create(1,"curiosity");select(s);let fail=false;try{observe(s,o(-1));}catch{fail=true;}assert(fail&&s.events.length===0,"invalid");assert(JSON.stringify(s)===JSON.stringify(restore(checkpoint(s))),"restore");});
 test("bounded exploration",()=>{for(const stream of Object.values(result.streams))for(const t of stream.trials)for(const p of POLICIES)assert(t.probes[p]<=Math.min(PROBE_CAP,Math.floor((t.rounds-1)/SPACING)),"budget");});
 test("cost and exact outcomes",()=>{for(const stream of Object.values(result.streams)){assert(stream.exact===result.seeds*result.rounds*5*4&&stream.heldout===stream.exact*3,"accuracy");for(const p of [...POLICIES,"v06"]){assert(stream.cost[p]>=stream.cost.hindsight&&stream.fullyCharged[p]===stream.cost[p]+stream.source[p],"cost");}}});
 test("deterministic",()=>assert(JSON.stringify(trial(api,old,v6,12,"gradual",9))===JSON.stringify(trial(api,old,v6,12,"gradual",9)),"determinism"));
 test("replays",()=>assert(Object.values(result.streams).every(s=>s.replays===result.seeds*4),"replay"));
 return names;
}
export {create,select,observe,checkpoint,restore,world,report,checks,peerAPI,previous,v06};
