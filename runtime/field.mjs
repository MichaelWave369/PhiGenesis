// Genesis Field v0.1 — bounded finite relational runtime (ES modules).
const TRAIN=[11,13,14,15,19,20,21,22,23,24,25,26,27,28,29,30], AUDIT=[0,1,2,4,8,16,7,31], TEST=[3,5,6,9,10,12,17,18], MAX_EVENTS=4096, MAX_BUDGET=32;
function parity(n){let p=0;while(n){p^=n&1;n>>>=1;}return p;}

function predict(rule,x){return parity((rule>>1)&x)^(rule&1);}

function create(){return {schema:1,events:[],memory:{},episode:null};}

function checkWorld(world){if(typeof world!=="string"||!/^w[0-9]{1,8}$/.test(world))throw Error("invalid world id");}

function finish(s,status,reason){let e=s.episode;e.status=status;e.reason=reason;e.pending=null;if(status==="accepted"){s.memory[e.world]={rule:e.candidate,episode:e.id};}return e;}

function prepare(s){
  let e=s.episode;
  if(e.status!=="running")return null;
  if(e.phase==="verify"&&e.auditIndex===AUDIT.length){finish(s,"accepted","audit passed");return null;}
  if(e.used>=e.budget){finish(s,"abstained","budget exhausted");return null;}
  if(e.phase==="discover"){
    if(e.live.length===0){finish(s,"abstained","no consistent rule");return null;}
    if(e.live.length===1){e.candidate=e.live[0];e.phase="verify";e.auditIndex=0;return prepare(s);}
    let best=-1,score=-1;
    for(const x of TRAIN){if(e.seen.includes(x))continue;let n=e.live.reduce((a,r)=>a+predict(r,x),0);let split=Math.min(n,e.live.length-n);if(split>score){score=split;best=x;}}
    if(score<=0){finish(s,"abstained","insufficient distinguishing observations");return null;}
    return e.pending={x:best,phase:"discover"};
  }
  return e.pending={x:AUDIT[e.auditIndex],phase:"verify"};
}

function start(s,world,budget=MAX_BUDGET,useMemory=true){
  checkWorld(world);if(!Number.isInteger(budget)||budget<1||budget>MAX_BUDGET||typeof useMemory!=="boolean")throw Error("invalid episode options");
  if(s.episode?.status==="running")throw Error("episode running");
  if(s.events.length>=MAX_EVENTS)throw Error("event limit");
  s.events.push({kind:"start",world,budget,useMemory});
  const prior=useMemory?s.memory[world]:undefined;
  s.episode={id:s.events.length,world,budget,used:0,status:"running",phase:prior?"verify":"discover",candidate:prior?.rule??null,
    prior:prior?.rule??null,reused:!!prior,invalidated:false,auditIndex:0,seen:[],live:Array.from({length:64},(_,i)=>i),pending:null,reason:null};
  prepare(s);return s.episode;
}

function observe(s,x,y){
  const e=s.episode;if(!e||e.status!=="running"||!e.pending||x!==e.pending.x||!(y===0||y===1))throw Error("unexpected observation");
  if(s.events.length>=MAX_EVENTS)throw Error("event limit");
  s.events.push({kind:"observation",x,y});e.used++;const phase=e.pending.phase;e.pending=null;
  if(phase==="discover"){e.seen.push(x);e.live=e.live.filter(r=>predict(r,x)===y);}
  else if(predict(e.candidate,x)!==y){
    if(e.reused){delete s.memory[e.world];e.invalidated=true;e.reused=false;e.candidate=null;e.phase="discover";e.auditIndex=0;}
    else{delete s.memory[e.world];finish(s,"abstained","independent audit contradiction");return e;}
  }else e.auditIndex++;
  prepare(s);return e;
}

function checkpoint(s){return JSON.stringify({schema:1,events:s.events});}

function restore(raw){
  if(typeof raw!=="string"||raw.length>1000000)throw Error("checkpoint size");
  let data=JSON.parse(raw);if(data.schema!==1||!Array.isArray(data.events)||data.events.length>MAX_EVENTS)throw Error("checkpoint format");
  let s=create();for(const ev of data.events){
    if(ev.kind==="start")start(s,ev.world,ev.budget,ev.useMemory);
    else if(ev.kind==="observation")observe(s,ev.x,ev.y);
    else throw Error("unknown event");
  }
  if(checkpoint(s)!==JSON.stringify(data))throw Error("noncanonical checkpoint");
  return s;
}

function runEpisode(s,world,oracle,options={}){
  start(s,world,options.budget??MAX_BUDGET,options.useMemory??true);
  while(s.episode.status==="running"){const {x}=s.episode.pending;observe(s,x,oracle(x));}
  return {...s.episode};
}

function report(seeds=90){
  if(!Number.isInteger(seeds)||seeds<1||seeds>1000)throw Error("seed limit");
  const rows=[];
  for(let i=0;i<seeds;i++){
    let z=(i+1)>>>0;const rnd=()=>{z=(Math.imul(1664525,z)+1013904223)>>>0;return z;};
    const a=rnd()%64,b=a^ (2<<(rnd()%5));
    const first=x=>predict(a,x),drift=x=>predict(b,x);
    const novel=x=>predict(b,x)^(((x>>1)&1)&((x>>3)&1));
    let s=create(),cold=create();
    const e1=runEpisode(s,"w1",first);
    const e2=runEpisode(s,"w1",first);
    const e3=runEpisode(cold,"w1",first,{useMemory:false});
    const e4=runEpisode(s,"w1",drift);
    const e5=runEpisode(s,"w1",novel);
    // Separate frozen evaluation on inputs never queried by either phase.
    const evaluate=(e,oracle)=>e.status==="accepted"?TEST.filter(x=>predict(e.candidate,x)===oracle(x)).length:null;
    rows.push({seed:i,first:e1.used,revisit:e2.used,cold:e3.used,drift:e4.used,novel:e5.used,
      firstCorrect:evaluate(e1,first),revisitCorrect:evaluate(e2,first),driftCorrect:evaluate(e4,drift),
      driftInvalidated:e4.invalidated,novelStatus:e5.status,novelCorrect:evaluate(e5,novel),
      replayEqual:checkpoint(restore(checkpoint(s)))===checkpoint(s)});
  }
  const sum=k=>rows.reduce((a,r)=>a+r[k],0);
  return {seeds,testPerAccepted:TEST.length,firstCorrect:sum("firstCorrect"),revisitCorrect:sum("revisitCorrect"),driftCorrect:sum("driftCorrect"),testCasesPerAffineCondition:seeds*TEST.length,
    driftInvalidations:sum("driftInvalidated"),novelAbstentions:rows.filter(r=>r.novelStatus==="abstained").length,
    novelAccepted:rows.filter(r=>r.novelStatus==="accepted").length,
    replayMatches:sum("replayEqual"),meanQueries:{first:sum("first")/seeds,revisit:sum("revisit")/seeds,cold:sum("cold")/seeds,drift:sum("drift")/seeds,novel:sum("novel")/seeds},rows};
}

function checks(){
  const assert=(condition,label)=>{if(!condition)throw Error(label);};
  const checks=[];
  function test(name,fn){fn();checks.push(name);}
  test("partition",()=>assert(new Set([...TRAIN,...AUDIT,...TEST]).size===32,"partition"));
  test("all affine rules",()=>{for(let r=0;r<64;r++){const e=runEpisode(create(),"w1",x=>predict(r,x));assert(e.status==="accepted"&&e.candidate===r,"rule "+r);}});
  test("restart mid-episode",()=>{let s=create();start(s,"w1");for(let i=0;i<3;i++){let x=s.episode.pending.x;observe(s,x,predict(37,x));}let t=restore(checkpoint(s));assert(JSON.stringify(s)===JSON.stringify(t),"restored state");for(const u of [s,t])while(u.episode.status==="running"){let x=u.episode.pending.x;observe(u,x,predict(37,x));}assert(checkpoint(s)===checkpoint(t),"continuation");});
  test("drift and invalidation",()=>{let s=create();runEpisode(s,"w1",x=>predict(11,x));let e=runEpisode(s,"w1",x=>predict(23,x));assert(e.invalidated&&e.candidate===23&&s.memory.w1.rule===23,"drift");});
  test("budget abstention",()=>assert(runEpisode(create(),"w1",x=>predict(12,x),{budget:2}).status==="abstained","budget"));
  test("invalid input",()=>{let s=create();start(s,"w1");let caught=false;try{observe(s,99,1);}catch{caught=true;}assert(caught&&s.events.length===1,"invalid input");});
  test("malformed checkpoint",()=>{let caught=false;try{restore('{"schema":1,"events":[{"kind":"bad"}]}');}catch{caught=true;}assert(caught,"malformed");});
  test("novel abstention and repeated results",()=>{let r=report(90);assert(r.novelAbstentions===90&&r.driftCorrect===720&&r.replayMatches===90,"report");assert(JSON.stringify(r)===JSON.stringify(report(90)),"determinism");});
  return checks;
}
export {create,start,observe,predict,checkpoint,restore,runEpisode,report,checks};
