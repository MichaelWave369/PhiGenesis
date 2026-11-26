import {createHash,sign,verify,createPublicKey,createPrivateKey,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,openSync,closeSync,fsyncSync,linkSync,unlinkSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {plan} from './phi025-planner.mjs';
import {replay as v26} from './phi026-protocol.mjs';
import {replay as v27} from './phi027-provenance.mjs';
import {replay,domain} from './phi028-accounting.mjs';
export const enc=x=>Buffer.from(JSON.stringify(x)),hash=x=>createHash('sha256').update(enc(x)).digest('hex');
const sha=b=>createHash('sha256').update(b).digest('hex');
export function openJournal(dir,config){
 const roles=['context','operator','evaluator','planner'],keys=Object.fromEntries(roles.map(r=>[r,createPublicKey(config[r])]));
 const fp=k=>sha(k.export({type:'spki',format:'der'}));
 if(Object.values(keys).some(k=>k.asymmetricKeyType!=='ed25519')||new Set(Object.values(keys).map(fp)).size!==4)throw Error('role keys');
 const artifact=sha(readFileSync(fileURLToPath(new URL('./phi025-planner.mjs',import.meta.url))));
 const identity=hash(['phi028-v1',config.session,artifact,...roles.map(r=>fp(keys[r]))]);
 const verifyAs=(role,b,s)=>typeof s==='string'&&s.length<=128&&verify(null,enc(b),keys[role],Buffer.from(s,'base64'));
 const env={session:config.session,artifact,hash,plan,replay:(es,e)=>v27(es,{...e,replay:v26}),verify:verifyAs};
 function signer(role,path){
  const k=createPrivateKey(readFileSync(path));if(fp(createPublicKey(k))!==fp(keys[role]))throw Error('wrong key');
  return (r,b)=>{if(r!==role)throw Error('wrong role');return sign(null,enc(b),k).toString('base64')};
 }
 const name=i=>String(i).padStart(3,'0')+'.json';
 function load(){
  const files=readdirSync(dir).filter(x=>x.endsWith('.json')).sort();
  if(files.length>180||files.some((x,i)=>x!==name(i)))throw Error('record gap');
  const events=[];let head=null;
  for(const [i,file] of files.entries()){
   const path=join(dir,file);if(statSync(path).size>131072)throw Error('record size');
   const bytes=readFileSync(path),r=JSON.parse(bytes);
   if(!bytes.equals(enc(r))||r.body.identity!==identity||r.body.sequence!==i||r.body.previous!==head||!verifyAs('operator',['phi028-record-v1',r.body],r.signature))throw Error('record integrity');
   events.push(r.body.event);head=hash(r);
  }
  return {events,head,state:replay(events,env)};
 }
 function append(event,operator,expected){
  const before=load();if(before.head!==expected)throw Error('stale head');
  const events=[...before.events,event],state=replay(events,env),body={identity,sequence:before.events.length,previous:before.head,event};
  const record={body,signature:operator('operator',['phi028-record-v1',body])};
  const bytes=enc(record);if(bytes.length>131072)throw Error('record size');
  const tmp=join(dir,'.'+randomUUID()+'.next'),fd=openSync(tmp,'wx',0o600);
  try{writeFileSync(fd,bytes);fsyncSync(fd)}finally{closeSync(fd)}
  try{linkSync(tmp,join(dir,name(body.sequence)));const d=openSync(dir,'r');try{fsyncSync(d)}finally{closeSync(d)}}finally{unlinkSync(tmp)}
  return {events,head:hash(record),state};
 }
 function workEvent(kind,body,operator,before){
  const b={session:env.session,history:hash(before.events),...body};
  return {kind,body:b,signature:operator('operator',domain(kind,b))};
 }
 return {load,append,workEvent,signer,env};
}
