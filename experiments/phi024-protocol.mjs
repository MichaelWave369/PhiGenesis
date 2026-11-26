// Φ024 append-only witness validation; cryptography and replay supplied by trusted host.
function protocol(){
 const exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const require=(v,m)=>{if(!v)throw Error(m)};
 function verifyCandidate(candidate,previous,env){
  require(exact(candidate,"anchor,snapshot"),"candidate");
  const {anchor,snapshot}=candidate;
  require(exact(anchor,"body,signature")&&exact(anchor.body,"trust,count,head"),"anchor");
  const b=anchor.body;
  require(b.trust===env.trust&&Number.isInteger(b.count)&&b.count>=0&&b.count<=54&&/^[a-f0-9]{64}$/.test(b.head)&&env.verify("operator",b,anchor.signature),"operator anchor");
  require(exact(snapshot,"trust,events")&&snapshot.trust===env.trust&&Array.isArray(snapshot.events)&&snapshot.events.length===b.count&&env.hash(snapshot)===b.head,"snapshot");
  if(previous===null)require(b.count===0,"genesis required");
  else require(b.count===previous.anchor.body.count+1&&same(snapshot.events.slice(0,-1),previous.snapshot.events),"non-extension");
  return env.replay(snapshot.events);
 }
 function verifyRecord(record,previous,previousHash,env){
  require(exact(record,"body,signature")&&exact(record.body,"witness,sequence,previous,candidate"),"record");
  const b=record.body;
  require(b.witness===env.witness&&b.sequence===(previous===null?0:previous.body.sequence+1)&&b.sequence<=54&&b.previous===previousHash&&env.verify("witness",b,record.signature),"witness signature or sequence");
  return verifyCandidate(b.candidate,previous===null?null:previous.body.candidate,env);
 }
 return {verifyCandidate,verifyRecord};
}
export const {verifyCandidate,verifyRecord}=protocol();
