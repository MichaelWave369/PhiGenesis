// Φ029 bounded checkpoint and fresh quorum validation.
function protocol(){
 const ids=["w0","w1","w2"],exact=(x,k)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).sort().join(",")===k.split(",").sort().join(","),must=(v,m)=>{if(!v)throw Error(m)},hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x),domain=(kind,b)=>["phi029-v1",kind,b];
 const validHead=(count,head)=>Number.isInteger(count)&&count>=0&&count<=180&&(count===0?head===null:hex(head));
 function checkpoint(record,previous,env,id){
  must(ids.includes(id)&&exact(record,"body,signature"),"checkpoint");const b=record.body;
  must(exact(b,"identity,witness,slot,previous,count,head")&&b.identity===env.identity&&b.witness===id&&b.slot===(previous?previous.body.slot+1:0)&&b.slot<=180&&b.previous===(previous?env.hash(previous):null)&&validHead(b.count,b.head)&&env.verify(id,domain("checkpoint",b),record.signature),"checkpoint binding");
  must(previous?b.count>previous.body.count:b.count===0,"checkpoint monotonicity");return b;
 }
 function extension(previous,heads){
  must(Array.isArray(heads)&&heads.length<=180&&heads.every(hex),"journal heads");
  if(previous){
   const {count,head}=previous.body;
   must(heads.length>=count&&(count===0?head===null:heads[count-1]===head),"rollback or fork");
  }else must(heads.length===0,"witness must bootstrap at genesis");
  return {count:heads.length,head:heads.at(-1)??null};
 }
 function quorum(responses,challenge,expected,env){
  must(Array.isArray(responses)&&responses.length===3&&typeof challenge==="string"&&/^[a-f0-9]{64}$/.test(challenge)&&validHead(expected.count,expected.head),"quorum input");
  const accepted=[];
  for(let i=0;i<3;i++){
   const r=responses[i];if(r===null)continue;
   must(exact(r,"body,signature"),"attestation");const b=r.body;
   must(exact(b,"identity,witness,challenge,count,head,checkpoint")&&b.identity===env.identity&&b.witness===ids[i]&&b.challenge===challenge&&validHead(b.count,b.head)&&hex(b.checkpoint)&&env.verify(ids[i],domain("attestation",b),r.signature),"attestation binding");
   must(b.count===expected.count&&b.head===expected.head,"witness disagreement");
   accepted.push(ids[i]);
  }
  must(accepted.length>=2,"quorum unavailable");
  return {count:expected.count,head:expected.head,witnesses:accepted,threshold:2,authority:"SHADOW_ONLY"};
 }
 return {checkpoint,extension,quorum,domain};
}
export const {checkpoint,extension,quorum,domain}=protocol();
