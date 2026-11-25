// RC2 attempted-work journal protocol; storage is injected.
const MAX_ATTEMPTS=288,MAX_RECORDS=120000;
function eq(a,b){return JSON.stringify(a)===JSON.stringify(b);}

function requireThat(c,msg){if(!c)throw Error(msg);}

function units(req){if(req.kind==="observation")return 1;if(req.kind==="calibration")return 10;if(req.kind==="packet")return 0;throw Error("request kind");}

function costOf(ops){
 const c={source:0,recipient:0,calibration:0,total:0,completed:0,uncertain:0};
 for(const {request,result} of ops){const n=units(request),kind=request.kind==="calibration"?"calibration":request.actor==="C"?"recipient":"source";c[kind]+=n;c.total+=n;if(result?.outcome==="ok")c.completed+=n;else c.uncertain+=n;}
 return c;
}

function traceOf(ops){return ops.map(({request:q,result:r})=>{
 requireThat(r,"unfinished operation");
 const t=q.kind==="observation"?{kind:q.kind,actor:q.actor,stage:q.stage,x:q.x,outcome:r.outcome}:q.kind==="calibration"?{kind:q.kind,sender:q.sender,outcome:r.outcome}:{kind:q.kind,sender:q.sender,offered:q.offered,outcome:r.outcome};
 if(r.outcome==="ok"){if(q.kind==="observation")t.y=r.value;else if(q.kind==="calibration")t.pairs=r.value;else t.received=r.value;}return t;
});}

function fold(records){
 requireThat(Array.isArray(records)&&records.length>0&&records.length<=MAX_RECORDS,"record bound");
 const h=records[0];requireThat(h.kind==="header"&&h.version===2&&Number.isInteger(h.seed)&&h.seed>=1&&h.seed<=0xffffffff&&["cold","memory","peer","adaptive"].includes(h.mode),"header");
 const s={header:h,events:[],attempts:[],active:null};
 for(const r of records.slice(1)){
  if(r.kind==="begin"){
   requireThat(!s.active&&s.attempts.length<MAX_ATTEMPTS&&s.events.length<144&&r.id===s.attempts.length+1&&Number.isInteger(r.budget)&&r.budget>=0&&r.budget<=192,"begin");
   s.active={id:r.id,budget:r.budget,ops:[]};
  }else{
   const a=s.active;requireThat(a&&r.id===a.id,"active attempt");
   if(r.kind==="reserve"){
    const q=r.request;requireThat(q&&r.op===a.ops.length+1&&a.ops.length<196&&(!a.ops.length||a.ops.at(-1).result),"reserve order");
    requireThat(costOf(a.ops).total+units(q)<=a.budget,"reserve budget");
    a.ops.push({request:q,result:null});
   }else if(r.kind==="result"){
    const op=a.ops.at(-1);requireThat(op&&!op.result&&r.op===a.ops.length&&["ok","error","invalid"].includes(r.result?.outcome),"result order");op.result=r.result;
   }else if(r.kind==="commit"){
    const e=r.event;requireThat(e&&["accepted","aborted","abstained"].includes(e.status)&&e.budget===a.budget&&e.world==="w"+(s.events.length+1)&&eq(e.trace,traceOf(a.ops))&&eq(e.cost,costOf(a.ops)),"commit mismatch");
    s.events.push(e);s.attempts.push({id:a.id,status:e.status,cost:e.cost,operations:a.ops.length});s.active=null;
   }else if(r.kind==="abandon"){
    requireThat(eq(r.cost,costOf(a.ops)),"abandon cost");s.attempts.push({id:a.id,status:"crash-abandoned",cost:r.cost,operations:a.ops.length});s.active=null;
   }else throw Error("record kind");
  }
 }
 return s;
}

function reconstruct(core,api,previous,records){
 const f=fold(records),raw=JSON.stringify({schema:10,seed:f.header.seed,mode:f.header.mode,events:f.events});
 return {folded:f,state:core.restore(api,previous,raw)};
}

function recover(journal){
 const f=fold(journal.records);if(f.active)journal.append({kind:"abandon",id:f.active.id,cost:costOf(f.active.ops)});
 return fold(journal.records);
}

function run(core,api,previous,journal,provider,budget=192,hook=()=>{}){
 const {folded:f,state}=reconstruct(core,api,previous,journal.records);
 requireThat(!f.active&&f.attempts.length<MAX_ATTEMPTS&&f.events.length<144&&Number.isInteger(budget)&&budget>=0&&budget<=192,"not ready");
 const id=f.attempts.length+1;journal.append({kind:"begin",id,budget});hook("after-begin",{id});
 let op=0;
 function invoke(request,fn,validate,invalid){
  op++;journal.append({kind:"reserve",id,op,request});hook("after-reserve",{id,op,request});
  let v,failed=false;try{v=fn();}catch{failed=true;}
  hook("after-invoke",{id,op,request});
  let result;
  if(failed)result={outcome:"error"};else if(!validate(v))result={outcome:"invalid"};else result={outcome:"ok",value:v};
  journal.append({kind:"result",id,op,result});hook("after-result",{id,op,request});
  if(failed)throw Error("recorded provider failure");
  return result.outcome==="ok"?v:invalid;
 }
 const wrapped={
  observe(actor,world,stage,x){return invoke({kind:"observation",actor,world,stage,x},()=>provider.observe(actor,world,stage,x),v=>v===0||v===1,2);},
  anchors(sender){return invoke({kind:"calibration",sender},()=>provider.anchors(sender),v=>{try{api.calibrate(v);return true;}catch{return false;}},[]);},
  transport(offered){const sender=JSON.parse(offered).sender;return invoke({kind:"packet",sender,offered},()=>provider.transport(offered),v=>typeof v==="string"&&v.length<=512,null);}
 };
 const next=core.advance(api,previous,state,wrapped,budget);
 const event=next.events.at(-1);
 // Validate the proposed commit before durable append; replay is also checked on reopen.
 const commit={kind:"commit",id,event};fold([...journal.records,commit]);hook("before-commit",{id});
 journal.append(commit);hook("after-commit",{id});return next;
}

function memoryJournal(seed=123,mode="cold"){return {records:[{kind:"header",version:2,seed,mode}],append(r){this.records.push(JSON.parse(JSON.stringify(r)));}};}

function checks(core,api,previous){
 const names=[];const test=(n,fn)=>{fn();names.push(n);};
 const assert=requireThat;
 test("complete cold and peer transactions replay",()=>{for(const mode of ["cold","peer"]){const j=memoryJournal(123,mode),e=core.environment(123,0);const s=run(core,api,previous,j,e.provider);assert(s.events[0].status==="accepted"&&eq(reconstruct(core,api,previous,j.records).state,s),"commit");}});
 test("all handled budget and error operations charged",()=>{const j=memoryJournal(),e=core.environment(123,0);run(core,api,previous,j,e.provider,5);let f=fold(j.records);assert(f.attempts[0].cost.total===5&&f.attempts[0].status==="aborted","budget");let n=0;run(core,api,previous,j,{...e.provider,observe(...a){if(n++===5)throw Error("fault");return e.provider.observe(...a);}});f=fold(j.records);assert(f.attempts[1].cost.total===6&&f.attempts[1].cost.uncertain===1,"external");});
 test("invalid outcome recorded without promotion",()=>{const j=memoryJournal(),s=run(core,api,previous,j,{observe:()=>2});assert(s.events[0].status==="aborted"&&fold(j.records).attempts[0].cost.uncertain===1,"invalid");});
 test("unfinished reservation conserved",()=>{const j=memoryJournal();j.append({kind:"begin",id:1,budget:192});j.append({kind:"reserve",id:1,op:1,request:{kind:"observation",actor:"C",world:"w1",stage:"learn",x:0}});let f=recover(j);assert(f.attempts[0].cost.uncertain===1&&!f.events.length,"uncertain");const len=j.records.length;recover(j);assert(j.records.length===len,"idempotent");});
 test("completed abandoned work not promoted",()=>{const j=memoryJournal();j.append({kind:"begin",id:1,budget:192});j.append({kind:"reserve",id:1,op:1,request:{kind:"observation",actor:"C",world:"w1",stage:"learn",x:0}});j.append({kind:"result",id:1,op:1,result:{outcome:"ok",value:1}});let f=recover(j);assert(f.attempts[0].cost.completed===1&&f.attempts[0].status==="crash-abandoned"&&!f.events.length,"abandon");const s=run(core,api,previous,j,core.environment(123,0).provider);assert(s.events.length===1&&fold(j.records).attempts.length===2,"continue");});
 test("commit mismatches rejected",()=>{const j=memoryJournal();run(core,api,previous,j,core.environment(123,0).provider);j.records.at(-1).event.cost.total++;let fail=false;try{fold(j.records);}catch{fail=true;}assert(fail,"cost tamper");});
 test("unfinished operations cannot commit",()=>{const j=memoryJournal();j.append({kind:"begin",id:1,budget:1});j.append({kind:"reserve",id:1,op:1,request:{kind:"observation",actor:"C",world:"w1",stage:"learn",x:0}});let fail=false;try{fold([...j.records,{kind:"commit",id:1,event:{status:"accepted",budget:1,world:"w1"}}]);}catch{fail=true;}assert(fail,"pending");});
 return names;
}
export {fold,reconstruct,recover,run,checks,memoryJournal};
