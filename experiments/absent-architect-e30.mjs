// ΦGenesis E3.0 — finite voluntary exchange fixture.
function experiment(){
 const ids=Array.from({length:9},(_,i)=>i),goods=["A","B"],policies=["isolated","bilateral","sender-only"],regimes=["balanced","specialized","shock","adversarial"],rounds=36;
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 const copy=x=>JSON.parse(JSON.stringify(x)),validId=x=>Number.isInteger(x)&&ids.includes(x),total=s=>goods.map(g=>s.reduce((a,b)=>a+b[g],0)),utility=s=>s.reduce((a,b)=>a+Math.min(b.A,b.B),0);
 function fixture(seed,g){const r=rng(seed),initial=ids.map(i=>g==="balanced"?{A:6,B:6}:i%3===0?{A:10,B:2}:i%3===1?{A:2,B:10}:{A:6,B:6});
 const schedule=Array.from({length:rounds},(_,t)=>{const actor=r(9),other=(actor+1+r(8))%9,kind=g==="adversarial"&&t%3===0?"forced":g==="adversarial"&&t%3===1?"forged":"normal";return {actor,other,kind,nonce:t}});
 // A shock is an externally specified relocation of resources, not an agent action.
 if(g==="shock"){for(const i of [0,1,2]){initial[i].A+=3;initial[(i+3)%9].A-=Math.min(3,initial[(i+3)%9].A)}}
 // use a conservative shock instead: initial allocation is simply a fixture; totals are measured from it.
 return {initial,schedule}}
 function quote(state,actor,other,nonce,kind){const a=state[actor],b=state[other],give=a.A>a.B?"A":"B",take=give==="A"?"B":"A";
 return {op:"swap",nonce,from:actor,to:other,give,take,amount:1+Number(Math.abs(a.A-a.B)>=4&&Math.abs(b.A-b.B)>=4),kind}}
 function delta(s,q,id){const b={...s[id]},sign=id===q.from?1:-1;b[q.give]-=q.amount*sign;b[q.take]+=q.amount*sign;return Math.min(b.A,b.B)-Math.min(s[id].A,s[id].B)}
 function shape(q){return q&&Object.keys(q).sort().join(",")==="amount,from,give,kind,nonce,op,take,to"&&q.op==="swap"&&["normal","forced","forged"].includes(q.kind)&&validId(q.from)&&validId(q.to)&&q.from!==q.to&&goods.includes(q.give)&&goods.includes(q.take)&&q.give!==q.take&&Number.isInteger(q.amount)&&q.amount>=1&&q.amount<=2&&Number.isInteger(q.nonce)&&q.nonce>=0&&q.nonce<36}
 // Grants are exact canonical quotes issued by the simulator-bound principals, not caller-supplied identity claims.
 function signature(q){return JSON.stringify([q.op,q.nonce,q.from,q.to,q.give,q.take,q.amount,q.kind])}
 function consent(state,q,principal){return shape(q)&&[q.from,q.to].includes(principal)&&state[q.from][q.give]>=q.amount&&state[q.to][q.take]>=q.amount&&delta(state,q,principal)>0?{principal,quote:signature(q)}:null}
 function execute(state,seen,q,actor,grants,policy){
  const deny=reason=>({state,reason});
  if(!policies.includes(policy))throw Error("unknown policy");
  if(!shape(q)||!validId(actor))return deny("malformed");
  if(actor!==q.from)return deny("actor");
  if(seen.has(q.nonce))return deny("replay");
  if(state[q.from][q.give]<q.amount||state[q.to][q.take]<q.amount)return deny("funds");
  if(policy==="isolated")return deny("disabled");
  const match=id=>grants.some(g=>g&&g.principal===id&&g.quote===signature(q));
  if(!match(q.from)||policy==="bilateral"&&!match(q.to))return deny("consent");
  const next=copy(state);next[q.from][q.give]-=q.amount;next[q.to][q.give]+=q.amount;next[q.to][q.take]-=q.amount;next[q.from][q.take]+=q.amount;
  if(JSON.stringify(total(next))!==JSON.stringify(total(state))||next.some(b=>goods.some(g=>!Number.isInteger(b[g])||b[g]<0)))throw Error("conservation");
  return {state:next,reason:"accepted"}
 }
 function trace(f,policy){let state=copy(f.initial);const seen=new Set(),events=[];
 for(const step of f.schedule){const {actor,other,nonce,kind}=step,q=quote(state,actor,other,nonce,kind);
  // A forced offer is intentionally rejected by the recipient; a forged actor requests on another's behalf.
  const actualActor=kind==="forged"?other:actor;
  const grants=[consent(state,q,actor),kind==="forced"?null:consent(state,q,other)].filter(Boolean);
  const before=copy(state),result=execute(state,seen,q,actualActor,grants,policy);
  if(result.reason==="accepted")seen.add(q.nonce);state=result.state;
  events.push({q,actor:actualActor,grants,before,after:copy(state),reason:result.reason})}
 return {policy,initial:copy(f.initial),events,final:copy(state)}}
 function replay(t){let state=copy(t.initial);const seen=new Set();
 for(const e of t.events){if(JSON.stringify(state)!==JSON.stringify(e.before))throw Error("before mismatch");const result=execute(state,seen,e.q,e.actor,e.grants,t.policy);if(result.reason!==e.reason||JSON.stringify(result.state)!==JSON.stringify(e.after))throw Error("transition mismatch");if(e.reason==="accepted")seen.add(e.q.nonce);state=result.state}
 if(JSON.stringify(state)!==JSON.stringify(t.final))throw Error("final mismatch");return true}
 function metrics(t){const accepted=t.events.filter(e=>e.reason==="accepted");return {accepted:accepted.length,unconsented:accepted.filter(e=>!e.grants.some(g=>g.principal===e.q.to&&g.quote===signature(e.q))).length,recipientLoss:accepted.reduce((s,e)=>s+Math.max(0,-delta(e.before,e.q,e.q.to)),0),gain:utility(t.final)-utility(t.initial),finalUtility:utility(t.final),minUtility:Math.min(...t.final.map(b=>Math.min(b.A,b.B))),replay:Number(replay(t)),conserved:Number(JSON.stringify(total(t.initial))===JSON.stringify(total(t.final)))}}
 function report(seeds=90){if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed budget");const rows=[];for(const g of regimes)for(const p of policies){const sum={accepted:0,unconsented:0,recipientLoss:0,gain:0,finalUtility:0,minUtility:0,replay:0,conserved:0};for(let seed=1;seed<=seeds;seed++){const v=metrics(trace(fixture(seed,g),p));for(const k of Object.keys(sum))sum[k]+=v[k]}rows.push({regime:g,policy:p,...Object.fromEntries(Object.entries(sum).map(([k,v])=>[k,v/seeds]))})}return {schema:"absent-architect-e30-v1",status:"SIMULATED",authority:"NONE",seeds,rows}}
 function test(){let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++};
 const f=fixture(1,"specialized"),s=f.initial,q=quote(s,0,1,0,"normal"),grants=[consent(s,q,0),consent(s,q,1)],seen=new Set();const a=execute(s,seen,q,0,grants,"bilateral");assert(a.reason==="accepted","valid swap");assert(utility(a.state)>utility(s),"mutual benefit");assert(JSON.stringify(total(a.state))===JSON.stringify(total(s)),"conserved");assert(execute(s,seen,q,0,[grants[0]],"bilateral").reason==="consent","receiver consent");assert(execute(s,seen,q,1,grants,"bilateral").reason==="actor","bound actor");assert(execute(s,new Set([0]),q,0,grants,"bilateral").reason==="replay","replay");assert(execute(s,seen,{...q,amount:1},0,grants,"bilateral").reason==="consent","changed terms");assert(execute(s,seen,{...q,amount:-1},0,grants,"bilateral").reason==="malformed","negative amount");assert(execute(s,seen,{...q,to:0},0,grants,"bilateral").reason==="malformed","self swap");
 for(const g of regimes)for(const p of policies)for(const seed of [1,7,19]){const f=fixture(seed,g),before=JSON.stringify(f),t=trace(f,p),m=metrics(t);assert(m.conserved===1&&m.replay===1,"invariants");assert(JSON.stringify(t)===JSON.stringify(trace(f,p)),"determinism");assert(JSON.stringify(f)===before,"fixture immutable");for(const e of t.events){assert(JSON.stringify(total(e.before))===JSON.stringify(total(e.after)),"per good conserved");assert(e.after.every(b=>goods.every(g=>Number.isInteger(b[g])&&b[g]>=0)),"nonnegative");if(e.reason!=="accepted")assert(JSON.stringify(e.before)===JSON.stringify(e.after),"atomic refusal");else if(p==="bilateral"){assert(e.grants.length===2&&delta(e.before,e.q,e.q.from)>0&&delta(e.before,e.q,e.q.to)>0,"two positive consents")}}
 const bad=copy(t);bad.final[0].A++;let denied=false;try{replay(bad)}catch{denied=true}assert(denied,"tampered final")}
 assert(JSON.stringify(report(3))===JSON.stringify(report(3)),"report replay");return {checks,status:"passed"}}
 return {report,test}
}
const engine=experiment();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e30.mjs [test|report [seeds]]');
