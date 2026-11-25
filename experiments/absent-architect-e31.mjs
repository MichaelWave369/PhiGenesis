// ΦGenesis E3.1 — finite cooperative infrastructure experiment.
function experiment(){
 const ids=Array.from({length:9},(_,i)=>i),policies=["isolated","open-commons","member-commons","compulsory"],regimes=["high-value","low-value","scarce","mixed-values"],rounds=9;
 const copy=x=>JSON.parse(JSON.stringify(x)),sum=a=>a.reduce((s,x)=>s+x,0);
 function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
 function fixture(seed,g){const r=rng(seed);return {initial:ids.map(()=>g==="scarce"?2+r(4):6+r(7)),projects:Array.from({length:rounds},(_,epoch)=>({epoch,cost:9,values:ids.map(()=>g==="high-value"?3+r(4):g==="low-value"?r(3):g==="scarce"?3+r(4):r(7)),willing:ids.map(()=>r(10)<8),order:(()=>{const a=ids.slice();for(let i=8;i>0;i--){const j=r(i+1);[a[i],a[j]]=[a[j],a[i]]}return a})()}))}}
 function signature(p,policy){return JSON.stringify([p.epoch,p.cost,policy])}
 function grants(state,p,policy){return p.order.filter(id=>p.willing[id]&&p.values[id]>3&&state.wallets[id]>=3).map(id=>({id,amount:3,terms:signature(p,policy)}))}
 function initial(f){return {wallets:f.initial.slice(),capital:0,benefits:ids.map(()=>0),built:[],spent:ids.map(()=>0)}}
 function apply(state,p,policy,provided){
  if(!policies.includes(policy))throw Error("policy");
  const refuse=reason=>({state,reason,payments:[],beneficiaries:[]});
  if(!Number.isInteger(p.epoch)||p.epoch<0||p.epoch>=rounds||p.cost!==9||p.values.length!==9||p.values.some(v=>!Number.isInteger(v)||v<0)||state.built.includes(p.epoch))return refuse("invalid-project");
  if(policy==="isolated")return refuse("disabled");
  if(!Array.isArray(provided)||provided.some(g=>!g||!ids.includes(g.id)||g.amount!==3||g.terms!==signature(p,policy))||new Set(provided.map(g=>g.id)).size!==provided.length)return refuse("invalid-grant");
  const eligible=policy==="compulsory"?p.order.filter(id=>state.wallets[id]>=3):provided.filter(g=>state.wallets[g.id]>=g.amount).map(g=>g.id);
  if(eligible.length<3)return refuse("underfunded");
  const payments=eligible.slice(0,3).map(id=>({id,amount:3})),beneficiaries=policy==="member-commons"?payments.map(x=>x.id):ids.slice();
  const next=copy(state);for(const x of payments){next.wallets[x.id]-=x.amount;next.spent[x.id]+=x.amount}
  next.capital+=9;next.built.push(p.epoch);for(const id of beneficiaries)next.benefits[id]+=p.values[id];
  if(sum(next.wallets)+next.capital!==sum(state.wallets)+state.capital||next.wallets.some(x=>x<0))throw Error("resource invariant");
  return {state:next,reason:"built",payments,beneficiaries}
 }
 function trace(f,policy){let state=initial(f);const events=[];for(const p of f.projects){const g=grants(state,p,policy),before=copy(state),r=apply(state,p,policy,g);events.push({project:p,grants:g,before,after:copy(r.state),reason:r.reason,payments:r.payments,beneficiaries:r.beneficiaries});state=r.state}return {policy,initial:initial(f),events,final:state}}
 function replay(t){let s=copy(t.initial);for(const e of t.events){if(JSON.stringify(s)!==JSON.stringify(e.before))throw Error("before");const r=apply(s,e.project,t.policy,e.grants);if(JSON.stringify([r.state,r.reason,r.payments,r.beneficiaries])!==JSON.stringify([e.after,e.reason,e.payments,e.beneficiaries]))throw Error("event");s=r.state}if(JSON.stringify(s)!==JSON.stringify(t.final))throw Error("final");return true}
 function metrics(t){const v=t.final.benefits.map((b,i)=>b-t.final.spent[i]);let unconsented=0,freeAccess=0,losingPayments=0,failed=0;
 for(const e of t.events){if(e.reason==="underfunded")failed++;for(const x of e.payments){if(!e.grants.some(g=>g.id===x.id))unconsented++;if(e.project.values[x.id]<x.amount)losingPayments++}freeAccess+=e.beneficiaries.filter(id=>!e.payments.some(x=>x.id===id)).length}
 return {built:t.final.built.length,failed,capital:t.final.capital,net:sum(v),minNet:Math.min(...v),negativeResidents:v.filter(x=>x<0).length,unconsented,losingPayments,freeAccess,beneficiaryEvents:t.events.reduce((s,e)=>s+e.beneficiaries.length,0),conserved:Number(sum(t.initial.wallets)===sum(t.final.wallets)+t.final.capital),replay:Number(replay(t))}
 }
 function report(seeds=90){if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seeds");const rows=[];for(const g of regimes)for(const p of policies){let s=null;for(let seed=1;seed<=seeds;seed++){const v=metrics(trace(fixture(seed,g),p));if(!s)s=Object.fromEntries(Object.keys(v).map(k=>[k,0]));for(const k of Object.keys(v))s[k]+=v[k]}rows.push({regime:g,policy:p,...Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v/seeds]))})}return {schema:"absent-architect-e31-v1",status:"SIMULATED",authority:"NONE",seeds,rows}}
 function test(){let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++};const f=fixture(1,"high-value"),s=initial(f),p={epoch:0,cost:9,values:ids.map(()=>5),willing:ids.map(()=>true),order:ids.slice()},g=grants(s,p,"open-commons");const a=apply(s,p,"open-commons",g);assert(a.reason==="built"&&a.payments.length===3&&a.beneficiaries.length===9,"valid open build");assert(apply(s,p,"open-commons",g.slice(0,2)).reason==="underfunded","funding threshold");assert(apply(s,p,"open-commons",[g[0],g[0],g[1]]).reason==="invalid-grant","duplicate");assert(apply(s,p,"open-commons",[{...g[0],amount:4},...g.slice(1)]).reason==="invalid-grant","altered amount");assert(apply(s,p,"member-commons",g).reason==="invalid-grant","different terms");assert(apply(a.state,p,"open-commons",g).reason==="invalid-project","duplicate build");
 for(const regime of regimes)for(const policy of policies)for(const seed of [1,7,19]){const f=fixture(seed,regime),before=JSON.stringify(f),t=trace(f,policy),m=metrics(t);assert(m.conserved&&m.replay,"ledger");assert(JSON.stringify(t)===JSON.stringify(trace(f,policy)),"determinism");assert(JSON.stringify(f)===before,"immutable fixture");for(const e of t.events){assert(sum(e.before.wallets)+e.before.capital===sum(e.after.wallets)+e.after.capital,"conservation");assert(e.after.wallets.every(x=>Number.isInteger(x)&&x>=0),"nonnegative");if(e.reason!=="built")assert(JSON.stringify(e.before)===JSON.stringify(e.after),"atomic refusal");else{assert(e.payments.length===3&&new Set(e.payments.map(x=>x.id)).size===3,"three distinct funders");assert(e.after.capital-e.before.capital===9,"capital accounting");if(policy!=="compulsory")assert(e.payments.every(x=>e.grants.some(g=>g.id===x.id)&&e.project.values[x.id]>x.amount),"consent and individual benefit");assert(e.beneficiaries.length===(policy==="member-commons"?3:9),"access contract")}}
 const bad=copy(t);bad.final.capital++;let denied=false;try{replay(bad)}catch{denied=true}assert(denied,"tampered final")}
 assert(JSON.stringify(report(3))===JSON.stringify(report(3)),"report replay");return {checks,status:"passed"}}
 return {report,test}
}
const engine=experiment();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e31.mjs [test|report [seeds]]');
