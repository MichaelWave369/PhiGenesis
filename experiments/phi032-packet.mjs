// Φ032 typed evidence packet; caller must verify Φ031 report before export.
function packetize(){
 const exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),must=(v,m)=>{if(!v)throw Error(m)};
 function packet(report,hash){
  must(report?.schema==="phi031-v1"&&report.authority==="NONE"&&report.events===33&&report.fuel===33&&Array.isArray(report.votes)&&report.votes.length===3&&report.votes.every(v=>Number.isInteger(v)&&v>=0&&v<=72)&&Array.isArray(report.runs)&&report.runs.length===3,"report");
  const max=Math.max(...report.votes),prediction=max>0&&report.votes.filter(x=>x===max).length===1?report.votes.indexOf(max):null;
  must(report.prediction===prediction&&report.votes.reduce((a,b)=>a+b,0)===report.evidence.nearest,"vote consistency");
  const heads=report.runs.map(r=>r.head);must(heads.every(h=>typeof h==="string"&&/^[a-f0-9]{64}$/.test(h)),"receipt heads");
  const body={schema:"phi032-advisory-v1",authority:"NONE",epoch:report.evidence.epoch,query:report.evidence.query,votes:report.votes.slice(),prediction,nearest:report.evidence.nearest,events:33,fuel:33,receiptHeads:heads,reportHash:hash(report)};
  must(Number.isInteger(body.epoch)&&body.epoch>=0&&body.epoch<24&&exact(body.query,"context,x,y,tag")&&[0,1,2].includes(body.query.context)&&[0,1].includes(body.query.tag)&&[body.query.x,body.query.y].every(x=>Number.isInteger(x)&&x>=0&&x<=8)&&/^[a-f0-9]{64}$/.test(body.reportHash),"bounds");
  return {body,digest:hash(body)};
 }
 function test(){
  const h=()=>"a".repeat(64),r={schema:"phi031-v1",authority:"NONE",events:33,fuel:33,votes:[2,1,0],prediction:0,evidence:{epoch:8,query:{context:0,x:1,y:2,tag:0},nearest:3},runs:[{head:h()},{head:h()},{head:h()}]};
  let checks=0;const check=v=>{if(!v)throw Error("test");checks++},deny=f=>{try{f();return false}catch{return true}};
  check(packet(r,h).body.prediction===0);check(packet({...r,votes:[1,1,1],prediction:null},h).body.prediction===null);check(packet({...r,votes:[0,0,0],prediction:null,evidence:{...r.evidence,nearest:0}},h).body.prediction===null);
  for(const bad of [{...r,authority:"PRODUCTION"},{...r,prediction:2},{...r,fuel:32},{...r,votes:[-1,2,2]},{...r,evidence:{...r.evidence,nearest:4}},{...r,runs:[]},{...r,evidence:{...r.evidence,query:{...r.evidence.query,command:"run"}}}])check(deny(()=>packet(bad,h)));
  return {checks,status:"passed"};
 }
 return {packet,test};
}
export const {packet,test}=packetize();
