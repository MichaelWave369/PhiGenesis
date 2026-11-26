// Φ031 typed scalar bridge from verified Φ030 snapshot to Altermath Causal Belt R1.
function bridge(){
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),must=(v,m)=>{if(!v)throw Error(m)};
 const buckets=["recent","middle","ancestral"];
 function translate(snapshot,query,env){
  const s=env.restore(snapshot);
  must(exact(query,"context,x,y,tag")&&[0,1,2].includes(query.context)&&[0,1].includes(query.tag)&&[query.x,query.y].every(n=>Number.isInteger(n)&&n>=0&&n<=8),"query");
  must(s.schema==="phi030-v1"&&s.authority==="NONE"&&s.memory.length<=72&&s.next>=1&&s.next<=24,"snapshot");
  const now=s.next-1,rows=s.memory.filter(m=>m.context===query.context&&m.tag===query.tag);
  must(rows.every(m=>m.due!==null&&m.due<=now&&m.epoch<m.due&&[0,1,2].includes(m.label)),"delivered evidence only");
  const dist=m=>Math.abs(m.x-query.x)+Math.abs(m.y-query.y);
  const minimum=rows.length?Math.min(...rows.map(dist)):null,nearest=rows.filter(m=>dist(m)===minimum);
  const partitions=buckets.map((name,i)=>({name,ids:nearest.filter(m=>{const age=now-m.epoch;return (age<=3?0:age<=7?1:2)===i}).map(m=>m.id).sort((a,b)=>a-b),votes:[0,1,2].map(label=>nearest.filter(m=>{const age=now-m.epoch;return (age<=3?0:age<=7?1:2)===i&&m.label===label}).length)}));
  return {schema:"phi031-memory-v1",epoch:now,query:{...query},minimum,eligible:rows.length,nearest:nearest.length,partitions};
 }
 function compile(evidence,label){
  must([0,1,2].includes(label)&&evidence.partitions.length===3,"label or partitions");
  const pockets={root:{fields:{}}},grants={root:{delegate:[],compose:["sum"],finish:["result"]}},score=[],returns=[];
  for(const [i,p] of evidence.partitions.entries()){
   must(p.name===buckets[i]&&Number.isInteger(p.votes[label])&&p.votes[label]>=0&&p.votes[label]<=72,"scalar vote");
   const pocket="root/"+p.name,d="delegate_"+i,o="observe_"+i,r="return_"+i;
   pockets[pocket]={fields:{votes:p.votes[label]}};grants.root.delegate.push(pocket);grants[pocket]={observe:["votes"],return:["root"]};
   score.push({id:d,op:"DELEGATE",pocket:"root",deps:[],child:pocket,allocation:2},{id:o,op:"OBSERVE",pocket,deps:[d],field:"votes"},{id:r,op:"RETURN",pocket,deps:[o],source:o});returns.push(r);
  }
  score.push({id:"compose",op:"COMPOSE",pocket:"root",deps:returns.slice(),gear:"sum",sources:returns.slice()},{id:"finish",op:"FINISH",pocket:"root",deps:["compose"],source:"compose"});
  return {score,pockets,grants,fuel:16};
 }
 function retrieve(snapshot,query,env){
  const evidence=translate(snapshot,query,env),runs=[0,1,2].map(label=>{
   const input=compile(evidence,label),r=env.runCausalScore(input);
   must(r.version==="Altermath.CausalBelt.R1"&&r.authority==="SIMULATED_LOCAL / NONE"&&r.events===11&&r.fuelConsumed===11&&r.rootFuelRemaining===5&&env.verifyCausalReceipts(r.receipts)&&r.result===evidence.partitions.reduce((n,p)=>n+p.votes[label],0),"interpreter result or receipt");
   return {label,result:r.result,fuel:r.fuelConsumed,events:r.events,head:r.receiptHead,receipts:r.receipts};
  });
  const votes=runs.map(r=>r.result),max=Math.max(...votes),prediction=max===0||votes.filter(v=>v===max).length!==1?null:votes.indexOf(max);
  must(votes.reduce((a,b)=>a+b,0)===evidence.nearest,"vote conservation");
  return {schema:"phi031-v1",authority:"NONE",evidence,votes,prediction,fuel:runs.reduce((n,r)=>n+r.fuel,0),events:runs.reduce((n,r)=>n+r.events,0),runs};
 }
 function verifyReport(snapshot,query,report,env){return same(retrieve(snapshot,query,env),report)}
 function test(env,run){
  let checks=0,cases=0,ties=0,empty=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++},deny=f=>{try{f();return false}catch{return true}};
  for(const regime of ["stationary","recurrent","delayed","contradictory"])for(const policy of ["recent","context-tagged"])for(const epoch of [1,9,18,24]){
   const s=run(7,regime,policy,epoch);
   for(const context of [0,1,2]){
    const q={context,x:(epoch+context)%9,y:(epoch*2+context)%9,tag:Math.floor((epoch-1)/6)%2};
    const r=retrieve(s,q,env);cases++;
    // Separate flat oracle, no dependence on partition translator.
    const rows=s.memory.filter(m=>m.context===q.context&&m.tag===q.tag).sort((a,b)=>(Math.abs(a.x-q.x)+Math.abs(a.y-q.y))-(Math.abs(b.x-q.x)+Math.abs(b.y-q.y)));
    const votes=[0,0,0];if(rows.length){const min=Math.abs(rows[0].x-q.x)+Math.abs(rows[0].y-q.y);for(const m of rows)if(Math.abs(m.x-q.x)+Math.abs(m.y-q.y)===min)votes[m.label]++}
    const max=Math.max(...votes),pred=max>0&&votes.filter(v=>v===max).length===1?votes.indexOf(max):null;
    assert(same(r.votes,votes)&&r.prediction===pred,"oracle");assert(r.events===33&&r.fuel===33&&r.authority==="NONE","fuel");assert(verifyReport(s,q,r,env),"replay");
    if(!rows.length)empty++;else if(pred===null)ties++;
    const bad=JSON.parse(JSON.stringify(r));bad.votes[0]++;assert(!verifyReport(s,q,bad,env),"report tamper");
   }
  }
  const s=run(7,"delayed","context-tagged",18),q={context:0,x:4,y:5,tag:0},e=translate(s,q,env),input=compile(e,0);
  const bad=JSON.parse(JSON.stringify(input));bad.grants["root/recent"].observe=[];assert(deny(()=>env.runCausalScore(bad)),"grant");
  assert(deny(()=>env.runCausalScore({...input,fuel:3})),"fuel");
  const cross=JSON.parse(JSON.stringify(input));cross.score.find(x=>x.id==="return_0").source="observe_1";cross.score.find(x=>x.id==="return_0").deps=["observe_1"];assert(deny(()=>env.runCausalScore(cross)),"cross-pocket");
  const forged=JSON.parse(JSON.stringify(s));forged.memory.push({id:-1});assert(deny(()=>retrieve(forged,q,env)),"snapshot");
  assert(deny(()=>retrieve(s,{...q,authority:"PRODUCTION"},env)),"query authority");
  const report=retrieve(s,q,env),receipt=JSON.parse(JSON.stringify(report.runs[0].receipts));receipt[0].fuelRemaining++;assert(!env.verifyCausalReceipts(receipt),"receipt tamper");
  return {status:"passed",checks,cases,ties,empty,events:cases*33,fuel:cases*33,authority:"NONE"};
 }
 return {translate,compile,retrieve,verifyReport,test};
}
export const {translate,compile,retrieve,verifyReport,test}=bridge();
