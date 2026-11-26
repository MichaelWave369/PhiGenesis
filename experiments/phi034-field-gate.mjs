// Φ034 release gate is research-only. Host must supply verified quorum state.
function gate(){
 const exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x),must=(v,m)=>{if(!v)throw Error(m)};
 function batchCheck(batch,hash){
  must(exact(batch,"schema,authority,rows")&&batch.schema==="phi034-review-batch-v1"&&batch.authority==="NONE"&&Array.isArray(batch.rows)&&batch.rows.length===12,"batch");
  const seen=new Set();
  for(const row of batch.rows){
   must(exact(row,"packet,review")&&exact(row.packet,"body,digest")&&hex(row.packet.digest)&&hash(row.packet.body)===row.packet.digest&&!seen.has(row.packet.digest),"packet binding");seen.add(row.packet.digest);
   const r=row.review;
   must(r?.schema==="phi033-review-v1"&&r.authority==="NONE"&&r.status==="HELD"&&r.zone==="BOUNDED"&&r.packetDigest===row.packet.digest&&row.packet.body.authority==="NONE","review binding");
   must(r.draft?.pending===true&&r.draft.actionAuthority===false&&r.draft.executionAuthority===false&&r.draft.packetDigest===row.packet.digest&&r.seal?.trusted_identity===false&&r.seal.action_authority===false&&r.seal.execution_authority===false,"draft authority");
   must(Array.isArray(r.projection?.grants)&&r.projection.grants.length===0&&Array.isArray(r.projection.ceiling)&&r.projection.ceiling.length===0,"projection");
   must(Array.isArray(r.receipts)&&r.receipts.length===4&&r.receipts.every((v,i)=>v.status===(i===3?"HELD":"ACCEPTED")&&v.action_authority===false&&v.execution_authority===false),"transition status");
  }
  return hash(batch);
 }
 function binding(batch,verified,identity,env){
  const c=verified?.certificate,t=verified?.state?.totals,s=verified?.state?.current?.state;
  must(c?.authority==="SHADOW_ONLY"&&Number.isInteger(c.count)&&c.count>0&&hex(c.head)&&Array.isArray(c.witnesses)&&new Set(c.witnesses).size===c.witnesses.length&&c.witnesses.length>=2&&c.witnesses.every(w=>["w0","w1","w2"].includes(w)),"verified checkpoint");
  must(t&&["reserved","completed","uncertain","unused","open"].every(k=>Number.isSafeInteger(t[k])&&t[k]>=0)&&t.reserved===t.completed+t.uncertain+t.unused+t.open&&t.open===0&&t.uncertain===0,"work not resolved");
  must(s&&JSON.stringify(s.production)==="[4,4,4]"&&s.pending===null&&verified.state.pending===null&&verified.state.evalWork===null&&verified.state.current.pendingDiscovery===null,"pending or production");
  return {schema:"phi034-association-v1",identity,batchHash:batchCheck(batch,env.hash),journalHead:c.head,journalCount:c.count,totals:t,authority:"NONE",release:"BLOCKED"};
 }
 function verifyAssociation(batch,verified,identity,record,env){
  const expected=binding(batch,verified,identity,env);
  must(exact(record,"body,signature")&&env.hash(record.body)===env.hash(expected)&&env.verify(["phi034-association-v1",record.body],record.signature),"association");
  return {status:"VALIDATED_RESEARCH_ONLY",release:"BLOCKED",authority:"NONE",batchHash:expected.batchHash,journalHead:expected.journalHead,blockers:["independent-key-custody","protected-monotonic-witness","runtime-attestation","cross-repo-work-accounting","live-enforcement","independent-evaluation"]};
 }
 return {batchCheck,binding,verifyAssociation};
}
export const {batchCheck,binding,verifyAssociation}=gate();
