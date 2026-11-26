import {createHash,createPrivateKey,createPublicKey,sign,verify,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,openSync,closeSync,fsyncSync,linkSync,unlinkSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {openJournal,enc,hash} from './phi028-journal.mjs';
import {checkpoint,extension,quorum,domain} from './phi029-protocol.mjs';
const ids=['w0','w1','w2'],roles=['context','operator','evaluator','planner',...ids],sha=b=>createHash('sha256').update(b).digest('hex');
const fp=k=>sha(k.export({type:'spki',format:'der'}));
export function environment(config,journal){
 const keys=Object.fromEntries(roles.map(r=>[r,createPublicKey(config[r])]));
 if(Object.values(keys).some(k=>k.asymmetricKeyType!=='ed25519')||new Set(Object.values(keys).map(fp)).size!==7)throw Error('distinct role keys required');
 const identity=hash(['phi029-v1',config.session,journal.env.artifact,...roles.map(r=>fp(keys[r]))]);
 const verifyAs=(id,b,s)=>typeof s==='string'&&s.length<=128&&verify(null,enc(b),keys[id],Buffer.from(s,'base64'));
 const signer=(id,path)=>{if(!ids.includes(id))throw Error('witness role');const k=createPrivateKey(readFileSync(path));if(fp(createPublicKey(k))!==fp(keys[id]))throw Error('wrong witness key');return b=>sign(null,enc(b),k).toString('base64')};
 return {identity,hash,verify:verifyAs,signer};
}
export function journalHeads(journal,dir){
 const loaded=journal.load(),heads=[];let previous=null;
 for(let i=0;i<loaded.events.length;i++){
  const path=join(dir,String(i).padStart(3,'0')+'.json');if(statSync(path).size>131072)throw Error('record size');
  const r=JSON.parse(readFileSync(path));
  if(r.body.sequence!==i||r.body.previous!==previous||JSON.stringify(r.body.event)!==JSON.stringify(loaded.events[i]))throw Error('journal changed');
  previous=hash(r);heads.push(previous);
 }
 if(previous!==loaded.head)throw Error('journal changed');
 return {heads,loaded};
}
export function openWitness(dir,id,env){
 if(!ids.includes(id))throw Error('witness id');
 const name=n=>String(n).padStart(3,'0')+'.json';
 function load(){
  const files=readdirSync(dir).filter(x=>x.endsWith('.json')).sort();
  if(files.length>181||files.some((x,i)=>x!==name(i)))throw Error('witness gap');
  let previous=null;
  for(const f of files){
   const p=join(dir,f);if(statSync(p).size>8192)throw Error('checkpoint size');
   const bytes=readFileSync(p),r=JSON.parse(bytes);if(!bytes.equals(enc(r)))throw Error('checkpoint encoding');
   checkpoint(r,previous,env,id);previous=r;
  }
  return previous;
 }
 function sync(heads,signer,cut){
  const previous=load(),tip=extension(previous,heads);
  if(previous&&tip.count===previous.body.count)return previous;
  const body={identity:env.identity,witness:id,slot:previous?previous.body.slot+1:0,previous:previous?hash(previous):null,...tip};
  const r={body,signature:signer(domain('checkpoint',body))};checkpoint(r,previous,env,id);
  const tmp=join(dir,'.'+randomUUID()+'.next'),fd=openSync(tmp,'wx',0o600);
  try{writeFileSync(fd,enc(r));fsyncSync(fd)}finally{closeSync(fd)}
  if(cut==='before-link')process.kill(process.pid,'SIGKILL');
  try{linkSync(tmp,join(dir,name(body.slot)));const d=openSync(dir,'r');try{fsyncSync(d)}finally{closeSync(d)}}finally{unlinkSync(tmp)}
  if(cut==='after-link')process.kill(process.pid,'SIGKILL');
  return r;
 }
 function attest(challenge,signer){
  if(!/^[a-f0-9]{64}$/.test(challenge))throw Error('challenge');const r=load();if(!r)throw Error('uninitialized witness');
  const body={identity:env.identity,witness:id,challenge,count:r.body.count,head:r.body.head,checkpoint:hash(r)};
  return {body,signature:signer(domain('attestation',body))};
 }
 return {load,sync,attest};
}
export function readQuorum(journal,dir,responses,challenge,env){
 const {heads,loaded}=journalHeads(journal,dir),certificate=quorum(responses,challenge,{count:heads.length,head:loaded.head},env);
 return {certificate,state:loaded.state};
}
