// Genesis Field v0.2: bounded compositional memory.
const TERMS=[1,2,3,4,5,6,8,9,10,12,16,17,18,20,24], TRAIN=[0,1,2,3,4,5,6,8,9,10,12,16,17,18,20,24], AUDIT=[7,11,13,14,15,19,21,22,23,25,26,27,28], TEST=[29,30,31], MAX_EVENTS=8192, MAX_BUDGET=48;
function pop(x){let n=0;while(x){n+=x&1;x>>>=1;}return n;}

function evaluate(rule,x){let y=rule.bias;for(const t of rule.terms)y^=Number((x&t)===t);return y;}

function oracle(rule,x){const bits=Array.from({length:5},(_,i)=>Math.floor(x/2**i)%2);return (rule.bias+rule.terms.reduce((sum,t)=>sum+bits.reduce((v,b,i)=>Math.floor(t/2**i)%2?v*b:v,1),0))%2;}

function candidates(terms){const supports=[[]];for(let i=0;i<terms.length;i++){supports.push([terms[i]]);for(let j=i+1;j<terms.length;j++)supports.push([terms[i],terms[j]]);}return supports.flatMap(terms=>[0,1].map(bias=>({bias,terms})));}

function create(){return {schema:2,events:[],library:{},worlds:{},episode:null};}

function finish(s,status,reason){const e=s.episode;e.status=status;e.reason=reason;e.pending=null;if(status==="accepted"){s.worlds[e.world]={rule:e.candidate,episode:e.id};for(const term of e.candidate.terms){const record=s.library[term]??={mask:term,provenance:[]};record.provenance.push({world:e.world,episode:e.id});}}else delete s.worlds[e.world];return e;}

function resetFull(e){e.mode="full";e.fallback=true;e.phase="discover";e.candidate=null;e.auditIndex=0;e.live=candidates(TERMS).filter(r=>e.observations.every(o=>evaluate(r,o.x)===o.y));}

function prepare(s){
 const e=s.episode;if(e.status!=="running")return null;
 if(e.phase==="verify"&&e.auditIndex===AUDIT.length){finish(s,"accepted","audit passed");return null;}
 if(e.used>=e.budget){finish(s,"abstained","budget exhausted");return null;}
 if(e.phase==="discover"){
  if(!e.live.length){if(e.mode==="memory"){resetFull(e);return prepare(s);}finish(s,"abstained","no consistent rule");return null;}
  if(e.live.length===1){e.candidate=e.live[0];e.phase="verify";e.auditIndex=0;return prepare(s);}
  let best=-1,score=-1;
  for(const x of TRAIN){if(e.observations.some(o=>o.x===x))continue;const ones=e.live.reduce((a,r)=>a+evaluate(r,x),0);const split=Math.min(ones,e.live.length-ones);if(split>score){score=split;best=x;}}
  if(score<=0){finish(s,"abstained","indistinguishable");return null;}
  return e.pending={x:best,phase:"discover"};
 }
 return e.pending={x:AUDIT[e.auditIndex],phase:"verify"};
}

function start(s,world,budget=MAX_BUDGET,useMemory=true){
 if(typeof world!=="string"||!/^w[0-9]{1,8}$/.test(world))throw Error("invalid world");
 if(!Number.isInteger(budget)||budget<1||budget>MAX_BUDGET||typeof useMemory!=="boolean")throw Error("invalid options");
 if(s.episode?.status==="running")throw Error("episode running");if(s.events.length>=MAX_EVENTS)throw Error("event limit");
 s.events.push({kind:"start",world,budget,useMemory});delete s.worlds[world];
 const saved=Object.keys(s.library).map(Number).sort((a,b)=>a-b),mode=useMemory&&saved.length?"memory":"full";
 s.episode={id:s.events.length,world,budget,used:0,status:"running",mode,initialMode:mode,fallback:false,phase:"discover",candidate:null,auditIndex:0,observations:[],live:candidates(mode==="memory"?saved:TERMS),pending:null,reason:null};
 prepare(s);return s.episode;
}

function observe(s,x,y){
 const e=s.episode;if(!e||e.status!=="running"||!e.pending||x!==e.pending.x||!(y===0||y===1))throw Error("unexpected observation");if(s.events.length>=MAX_EVENTS)throw Error("event limit");
 s.events.push({kind:"observation",x,y});e.used++;const phase=e.pending.phase;e.pending=null;
 if(phase==="discover"){e.observations.push({x,y});e.live=e.live.filter(r=>evaluate(r,x)===y);}
 else if(evaluate(e.candidate,x)!==y){if(e.mode==="memory")resetFull(e);else {finish(s,"abstained","audit contradiction");return e;}}
 else e.auditIndex++;
 prepare(s);return e;
}

function checkpoint(s){return JSON.stringify({schema:2,events:s.events});}

function restore(raw){
 if(typeof raw!=="string"||raw.length>2000000)throw Error("checkpoint size");const data=JSON.parse(raw);if(data.schema!==2||!Array.isArray(data.events)||data.events.length>MAX_EVENTS)throw Error("checkpoint format");
 const s=create();for(const ev of data.events){if(ev.kind==="start")start(s,ev.world,ev.budget,ev.useMemory);else if(ev.kind==="observation")observe(s,ev.x,ev.y);else throw Error("unknown event");}
 if(checkpoint(s)!==JSON.stringify(data))throw Error("noncanonical checkpoint");return s;
}

function runEpisode(s,world,observeWorld,opts={}){
 start(s,world,opts.budget??MAX_BUDGET,opts.useMemory??true);while(s.episode.status==="running"){const {x}=s.episode.pending;observe(s,x,observeWorld(x));}return s.episode;
}

function makeRng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function report(seeds=90){
 if(!Number.isInteger(seeds)||seeds<1||seeds>1000)throw Error("seed limit");
 const rows=[];
 for(let i=0;i<seeds;i++){
  const rng=makeRng(0x9e3779b9+i),pool=TERMS.filter(t=>pop(t)===2);
  for(let j=pool.length-1;j>0;j--){const k=rng()%(j+1);[pool[j],pool[k]]=[pool[k],pool[j]];}
  const [a,b,c,d]=pool,s=create(),rule=(u,v)=>({bias:rng()&1,terms:[u,v].sort((a,b)=>a-b)});
  const src1=rule(a,b),src2=rule(b,c),familiar=rule(a,c),novel=rule(a,d),world=r=>x=>oracle(r,x);
  const p1=runEpisode(s,"w1",world(src1)),p2=runEpisode(s,"w2",world(src2)),saved=checkpoint(s);
  const familiarRun=runEpisode(s,"w3",world(familiar)),cold=runEpisode(create(),"w3",world(familiar),{useMemory:false});
  const novelRun=runEpisode(restore(saved),"w4",world(novel)),novelCold=runEpisode(create(),"w4",world(novel),{useMemory:false});
  const unsupportedRun=runEpisode(restore(saved),"w5",x=>Number((x&7)===7));
  const score=(e,r)=>e.status==="accepted"?TEST.filter(x=>evaluate(e.candidate,x)===oracle(r,x)).length:0;
  rows.push({seed:i,sourceQueries:p1.used+p2.used,sourceAccepted:Number(p1.status==="accepted")+Number(p2.status==="accepted"),sourceExact:Number(JSON.stringify(p1.candidate)===JSON.stringify(src1))+Number(JSON.stringify(p2.candidate)===JSON.stringify(src2)),memoryQueries:familiarRun.used,coldQueries:cold.used,novelQueries:novelRun.used,novelColdQueries:novelCold.used,novelFallback:novelRun.fallback,unsupportedStatus:unsupportedRun.status,familiarCorrect:score(familiarRun,familiar),coldCorrect:score(cold,familiar),novelCorrect:score(novelRun,novel),novelColdCorrect:score(novelCold,novel),familiarExact:JSON.stringify(familiarRun.candidate)===JSON.stringify(familiar),novelExact:JSON.stringify(novelRun.candidate)===JSON.stringify(novel),replayEqual:checkpoint(restore(checkpoint(s)))===checkpoint(s),terms:Object.keys(s.library).length});
 }
 const sum=k=>rows.reduce((a,r)=>a+Number(r[k]),0);
 return {seeds,terms:TERMS.length,hypotheses:candidates(TERMS).length,train:TRAIN.length,audit:AUDIT.length,test:TEST.length,sourceAccepted:sum("sourceAccepted"),sourceExact:sum("sourceExact"),familiarCorrect:sum("familiarCorrect"),coldCorrect:sum("coldCorrect"),novelCorrect:sum("novelCorrect"),novelColdCorrect:sum("novelColdCorrect"),familiarExact:sum("familiarExact"),novelExact:sum("novelExact"),testCasesPerCondition:seeds*TEST.length,novelFallbacks:sum("novelFallback"),unsupportedAbstentions:rows.filter(r=>r.unsupportedStatus==="abstained").length,replayMatches:sum("replayEqual"),meanQueries:Object.fromEntries(["sourceQueries","memoryQueries","coldQueries","novelQueries","novelColdQueries"].map(k=>[k,sum(k)/seeds])),rows};
}

function checks(){
 const names=[];function test(name,fn){fn();names.push(name);}function assert(c,m){if(!c)throw Error(m);}
 test("disjoint partitions",()=>assert(new Set([...TRAIN,...AUDIT,...TEST]).size===32,"partition"));
 test("audit distinguishes all hypotheses",()=>assert(new Set(candidates(TERMS).map(r=>AUDIT.map(x=>evaluate(r,x)).join(""))).size===242,"audit collision"));
 test("all 242 rules and independent oracle",()=>{for(const rule of candidates(TERMS)){for(let x=0;x<32;x++)assert(evaluate(rule,x)===oracle(rule,x),"oracle");const e=runEpisode(create(),"w1",x=>oracle(rule,x));assert(e.status==="accepted"&&JSON.stringify(e.candidate)===JSON.stringify(rule),"rule");}});
 test("composed memory provenance",()=>{const s=create();runEpisode(s,"w1",x=>oracle({bias:0,terms:[3,5]},x));runEpisode(s,"w2",x=>oracle({bias:1,terms:[5,6]},x));const e=runEpisode(s,"w3",x=>oracle({bias:1,terms:[3,6]},x));assert(e.status==="accepted"&&e.initialMode==="memory"&&!e.fallback&&s.library[3].provenance.length===2,"memory");});
 test("novel fallback",()=>{const s=create();runEpisode(s,"w1",x=>oracle({bias:0,terms:[3]},x));const e=runEpisode(s,"w2",x=>oracle({bias:1,terms:[12]},x));assert(e.status==="accepted"&&e.fallback&&s.library[12],"fallback");});
 test("budget abstention",()=>assert(runEpisode(create(),"w1",x=>x&1,{budget:1}).status==="abstained","budget"));
 test("restart mid-episode",()=>{let s=create();start(s,"w1");for(let i=0;i<3;i++){let x=s.episode.pending.x;observe(s,x,oracle({bias:1,terms:[3,6]},x));}let t=restore(checkpoint(s));assert(JSON.stringify(s)===JSON.stringify(t),"replay");for(const u of [s,t])while(u.episode.status==="running"){let x=u.episode.pending.x;observe(u,x,oracle({bias:1,terms:[3,6]},x));}assert(checkpoint(s)===checkpoint(t),"continuation");});
 test("bad observation",()=>{let s=create();start(s,"w1");let caught=false;try{observe(s,99,0);}catch{caught=true;}assert(caught&&s.events.length===1,"invalid");});
 test("benchmark",()=>{const r=report(90);assert(r.familiarCorrect===270&&r.novelCorrect===270&&r.sourceExact===180&&r.familiarExact===90&&r.novelExact===90&&r.replayMatches===90&&r.unsupportedAbstentions===90,"benchmark");});
 return names;
}
export {create,start,observe,evaluate,oracle,checkpoint,restore,runEpisode,report,checks};
