// Genesis Field v0.5: bounded online strategy learning.
import * as peerAPI from "./field-v03.mjs";
const METHODS=["cold","memory","peer"],H=4,WINDOW=12,EPSILON=0.12,MAX_ROUNDS=360,TEST=[29,30,31];
function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function shuffle(list,next){let a=[...list];for(let i=a.length-1;i>0;i--){let j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

function mask(x,p){let r=0;for(let i=0;i<5;i++)if(x&(1<<i))r|=1<<p[i];return r;}

function inverse(p){return Array.from({length:5},(_,i)=>p.indexOf(i));}

function oracle(r,x){return (r.bias+r.terms.reduce((s,t)=>s+Array.from({length:5},(_,i)=>i).filter(i=>Math.floor(t/2**i)%2).reduce((v,i)=>v*(Math.floor(x/2**i)%2),1),0))%2;}

function makeBatch(seed,round,drift=true){
 const next=rng((seed+Math.imul(round+1,0x9e3779b9))>>>0||1),pa=shuffle([0,1,2,3,4],next),pc=shuffle([0,1,2,3,4],next);
 const terms=[3,5,6,9,10,12,17,18,20,24],pairs=[];for(let i=0;i<terms.length;i++)for(let j=i+1;j<terms.length;j++)pairs.push([terms[i],terms[j]]);
 const phase=drift?Math.floor(round/60)%3:0;
 const tasks=shuffle(pairs,next).slice(0,H).map(terms=>({truth:{bias:next()&1,terms},corrupt:phase===1?next()%10<9:phase===2?next()%10<1:false}));
 return {pa,pc,tasks,phase};
}

function execute(api,world,method){
 const {pa,pc,tasks}=world,recipient=api.instance("C"),sender=method==="peer"?api.instance("A"):null,anchors=Array.from({length:5},(_,i)=>[1<<pa[i],1<<pc[i]]);
 let cost=method==="peer"?10:0,source=0,exact=0,heldout=0,rejected=0;
 const ia=inverse(pa),ic=inverse(pc);
 for(let i=0;i<tasks.length;i++){
  const {truth,corrupt}=tasks[i],id="w"+(i+1),obs=x=>oracle(truth,mask(x,ic)),expected=api.translate(truth,pc);
  let result;
  if(method==="peer"){
   const src=api.learn(sender,id,x=>oracle(truth,mask(x,ia)));source+=src.used;
   if(src.status!=="accepted")throw Error("source abstained");
   const raw=api.packet("A",id,{bias:src.rule.bias^Number(corrupt),terms:src.rule.terms});
   result=api.receive(recipient,raw,anchors,obs,"A",id);cost+=result.used;
   if(result.status!=="accepted"){rejected++;result=api.learn(recipient,id,obs);cost+=result.used;}
  }else{result=api.learn(method==="cold"?api.instance("cold"):recipient,id,obs,{useMemory:method==="memory"});cost+=result.used;}
  if(result.status==="accepted"){exact+=Number(JSON.stringify(result.rule)===JSON.stringify(expected));heldout+=TEST.reduce((s,x)=>s+Number(oracle(result.rule,x)===obs(x)),0);}
 }
 return {cost,source,exact,heldout,rejected};
}

function create(seed){if(!Number.isInteger(seed)||seed<1||seed>0xffffffff)throw Error("seed");return {schema:5,seed,events:[],pending:null};}

function select(s){
 if(s.pending!==null)return s.pending;if(s.events.length>=MAX_ROUNDS)throw Error("round limit");
 const i=s.events.length,next=rng((s.seed^Math.imul(i+1,0x85ebca6b))>>>0||1);
 const estimates=METHODS.map(m=>{const rows=s.events.filter(e=>e.method===m).slice(-WINDOW);if(!rows.length)return null;const mean=rows.reduce((v,e)=>v+e.cost,0)/rows.length;const variance=rows.reduce((v,e)=>v+(e.cost-mean)**2,0)/rows.length;return {n:rows.length,mean,se:Math.sqrt(variance/rows.length)};});
 let index=estimates.findIndex(x=>x===null),explore=index>=0;
 if(index<0){explore=next()/2**32<EPSILON;index=explore?next()%3:estimates.reduce((a,b,j)=>b.mean<estimates[a].mean?j:a,0);}
 return s.pending={method:METHODS[index],explore,estimates};
}

function observe(s,result){
 if(!s.pending||!result||!Number.isInteger(result.cost)||result.cost<0||result.cost>202||!Number.isInteger(result.source)||result.source<0||result.source>192||!Number.isInteger(result.exact)||result.exact<0||result.exact>H||!Number.isInteger(result.heldout)||result.heldout<0||result.heldout>H*3||!Number.isInteger(result.rejected)||result.rejected<0||result.rejected>H)throw Error("invalid outcome");
 if(s.pending.method!=="peer"&&(result.source!==0||result.rejected!==0))throw Error("invalid local outcome");
 s.events.push({method:s.pending.method,cost:result.cost,source:result.source,exact:result.exact,heldout:result.heldout,rejected:result.rejected,explore:s.pending.explore});s.pending=null;
}

function checkpoint(s){return JSON.stringify({schema:5,seed:s.seed,events:s.events,pending:s.pending!==null});}

function restore(raw){
 if(typeof raw!=="string"||raw.length>1000000)throw Error("checkpoint size");const d=JSON.parse(raw);if(d.schema!==5||!Array.isArray(d.events)||d.events.length>MAX_ROUNDS||typeof d.pending!=="boolean")throw Error("checkpoint schema");
 const s=create(d.seed);for(const e of d.events){const p=select(s);if(p.method!==e.method||p.explore!==e.explore)throw Error("decision mismatch");observe(s,e);}if(d.pending)select(s);if(checkpoint(s)!==raw)throw Error("noncanonical checkpoint");return s;
}

function trial(api,seed,drift=true,rounds=180){
 if(!Number.isInteger(rounds)||rounds<1||rounds>MAX_ROUNDS)throw Error("rounds");
 let s=create(seed),totals={cold:0,memory:0,peer:0,adaptive:0,hindsight:0},phases=[],rows=[],exact=0,heldout=0,source=0,replay=0;
 for(let i=0;i<rounds;i++){
  const world=makeBatch(seed,i,drift),decision=select(s);
  if(i===Math.floor(rounds/2)){s=restore(checkpoint(s));replay++;}
  // Execute only selected arm before updating; evaluator then runs counterfactuals.
  const selected=execute(api,world,decision.method);observe(s,selected);
  const other=Object.fromEntries(METHODS.map(m=>[m,m===decision.method?selected:execute(api,world,m)]));
  const cost=Object.fromEntries(METHODS.map(m=>[m,other[m].cost]));
  for(const m of METHODS)totals[m]+=cost[m];totals.adaptive+=selected.cost;totals.hindsight+=Math.min(...Object.values(cost));
  exact+=selected.exact;heldout+=selected.heldout;source+=selected.source;
  const idx=Math.floor(i/60);if(!phases[idx])phases[idx]={phase:idx,rounds:0,cold:0,memory:0,peer:0,adaptive:0,hindsight:0,choices:{cold:0,memory:0,peer:0}};
  const p=phases[idx];p.rounds++;for(const m of METHODS)p[m]+=cost[m];p.adaptive+=selected.cost;p.hindsight+=Math.min(...Object.values(cost));p.choices[decision.method]++;
  rows.push({round:i,phase:world.phase,decision:decision.method,explore:decision.explore,estimates:decision.estimates,outcome:selected,counterfactual:cost,allExact:METHODS.every(m=>other[m].exact===H&&other[m].heldout===H*3)});
 }
 if(checkpoint(restore(checkpoint(s)))!==checkpoint(s))throw Error("final replay");
 return {seed,drift,rounds,totals,phases,exact,heldout,source,replay,rows};
}

function report(api,seeds=18,rounds=180){
 if(!Number.isInteger(seeds)||seeds<1||seeds>90)throw Error("seeds");
 const summary={};for(const drift of [true,false]){
  const trials=Array.from({length:seeds},(_,i)=>trial(api,(0x8391d733+i*31337)>>>0,drift,rounds)),totals=Object.fromEntries(["cold","memory","peer","adaptive","hindsight"].map(k=>[k,trials.reduce((v,t)=>v+t.totals[k],0)]));
  const phases=trials[0].phases.map((_,j)=>{const out={phase:j,rounds:0,cold:0,memory:0,peer:0,adaptive:0,hindsight:0,choices:{cold:0,memory:0,peer:0}};for(const t of trials){const p=t.phases[j];for(const k of ["rounds","cold","memory","peer","adaptive","hindsight"])out[k]+=p[k];for(const m of METHODS)out.choices[m]+=p.choices[m];}return out;});
  summary[drift?"drift":"stationary"]={totals,phases,exact:trials.reduce((s,t)=>s+t.exact,0),heldout:trials.reduce((s,t)=>s+t.heldout,0),historicalSource:trials.reduce((s,t)=>s+t.source,0),restarts:trials.reduce((s,t)=>s+t.replay,0),allExact:trials.every(t=>t.rows.every(r=>r.allExact)),trials:trials.map(({rows,...t})=>t)};
 }
 return {seeds,rounds,targetsPerBatch:H,window:WINDOW,epsilon:EPSILON,summary};
}

function checks(api,result){
 const out=[];function test(n,f){f();out.push(n);}function assert(x,m){if(!x)throw Error(m);}
 test("forced exploration",()=>{let s=create(12);for(let i=0;i<3;i++){assert(select(s).method===METHODS[i],"initial");observe(s,{cost:80,source:0,exact:4,heldout:12,rejected:0});}});
 test("pending replay",()=>{let s=create(32);select(s);let t=restore(checkpoint(s));assert(JSON.stringify(s)===JSON.stringify(t),"pending");});
 test("observed outcomes only",()=>{let s=create(32);let p=select(s);observe(s,{cost:80,source:0,exact:4,heldout:12,rejected:0});let q=select(s);assert(q.estimates.filter(Boolean).length===1&&q.estimates[METHODS.indexOf(p.method)].mean===80,"leak");});
 test("malformed outcome rejected",()=>{let s=create(1);select(s);let ok=false;try{observe(s,{cost:-1});}catch{ok=true;}assert(ok&&s.events.length===0,"invalid");});
 test("tamper decision rejected",()=>{let s=create(1);select(s);observe(s,{cost:80,source:0,exact:4,heldout:12,rejected:0});let d=JSON.parse(checkpoint(s));d.events[0].method="peer";let ok=false;try{restore(JSON.stringify(d));}catch{ok=true;}assert(ok,"tamper");});
 test("all accepted predictions",()=>{for(const r of Object.values(result.summary))assert(r.allExact&&r.exact===result.seeds*result.rounds*H&&r.heldout===r.exact*3,"exact");});
 test("cost accounting",()=>{for(const r of Object.values(result.summary)){assert(r.totals.adaptive>=r.totals.hindsight,"bound");assert(r.phases.reduce((s,p)=>s+p.adaptive,0)===r.totals.adaptive,"sum");}});
 test("deterministic execution",()=>assert(JSON.stringify(trial(api,17,true,9))===JSON.stringify(trial(api,17,true,9)),"determinism"));
 test("restart counts",()=>assert(Object.values(result.summary).every(r=>r.restarts===result.seeds),"restart"));
 return out;
}
export {create,select,observe,checkpoint,restore,makeBatch,execute,trial,report,checks,peerAPI};
