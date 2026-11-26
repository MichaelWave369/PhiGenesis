import {createHash,createPrivateKey,createPublicKey,sign,verify as verifySig,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,openSync,closeSync,fsyncSync,linkSync,unlinkSync,statSync,mkdirSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {replay} from './phi023-protocol.mjs';
import {verifyCandidate,verifyRecord} from './phi024-protocol.mjs';
const [command,dir,trustPath,keyPath,store,anchorPath,cut]=process.argv.slice(2);
const fail=m=>{throw Error(m)};
if(!command||!dir||!trustPath)fail('usage: inspect|admit witness-dir trust [witness-key store operator-anchor [test-cut]]');
const enc=x=>Buffer.from(JSON.stringify(x)),hashBytes=b=>createHash('sha256').update(b).digest('hex'),hash=x=>hashBytes(enc(x));
function read(path,max=131072){if(statSync(path).size>max)fail('size');return readFileSync(path)}
const trust=JSON.parse(read(trustPath,8192));
const keys=Object.fromEntries(['operator','evaluator','witness'].map(r=>[r,createPublicKey(trust[r])]));
const fp=k=>hashBytes(k.export({type:'spki',format:'der'}));
if(Object.values(keys).some(k=>k.asymmetricKeyType!=='ed25519')||new Set(Object.values(keys).map(fp)).size!==3)fail('distinct role keys');
const trustId=hash([trust.session,fp(keys.operator),fp(keys.evaluator)]),witnessId=hash([trustId,fp(keys.witness)]);
const verify=(role,v,s)=>typeof s==='string'&&s.length<=128&&verifySig(null,enc(v),keys[role],Buffer.from(s,'base64'));
const env={trust:trustId,witness:witnessId,hash,verify,replay:events=>replay(events,verify,trust.session)};
const name=n=>String(n).padStart(3,'0')+'.json';
function syncDir(){const fd=openSync(dir,'r');try{fsyncSync(fd)}finally{closeSync(fd)}}
function load(){
 const files=readdirSync(dir).filter(x=>x.endsWith('.json')).sort();
 if(files.length>55||files.some((x,i)=>x!==name(i)))fail('witness sequence gap');
 let last=null,lastHash=null,state=null;
 for(const file of files){
  const bytes=read(join(dir,file)),record=JSON.parse(bytes);
  if(!bytes.equals(enc(record)))fail('noncanonical record');
  state=verifyRecord(record,last,lastHash,env);last=record;lastHash=hash(record);
 }
 return {last,lastHash,state};
}
function view(s){if(!s.last)fail('uninitialized witness');return {sequence:s.last.body.sequence,head:s.last.body.candidate.anchor.body.head,witnessHead:s.lastHash,state:s.state}}
if(command==='inspect'){console.log(JSON.stringify(view(load())))}
else if(command==='admit'){
 if(!keyPath||!store||!anchorPath)fail('missing input');
 if(cut!==undefined&&!['before-link','after-durable-link'].includes(cut))fail('unknown test cut');
 const key=createPrivateKey(read(keyPath,8192));
 if(fp(createPublicKey(key))!==fp(keys.witness))fail('wrong witness key');
 mkdirSync(dir,{recursive:true,mode:0o700});
 const current=load(),anchor=JSON.parse(read(anchorPath,8192));
 if(!anchor.body||!/^[a-f0-9]{64}$/.test(anchor.body.head))fail('anchor path');
 const bytes=read(join(store,anchor.body.head+'.json'));
 if(hashBytes(bytes)!==anchor.body.head)fail('snapshot bytes');
 const candidate={anchor,snapshot:JSON.parse(bytes)};
 // Duplicate submission is idempotent only for the exact currently witnessed candidate.
 if(current.last&&JSON.stringify(candidate)===JSON.stringify(current.last.body.candidate)){
  console.log(JSON.stringify({...view(current),duplicate:true}));
 }else{
  const state=verifyCandidate(candidate,current.last?.body.candidate??null,env);
  const sequence=current.last?current.last.body.sequence+1:0;
  const body={witness:witnessId,sequence,previous:current.lastHash,candidate};
  const record={body,signature:sign(null,enc(body),key).toString('base64')};
  verifyRecord(record,current.last,current.lastHash,env);
  const path=join(dir,name(sequence)),temp=join(dir,'.'+randomUUID()+'.next'),fd=openSync(temp,'wx',0o600);
  try{writeFileSync(fd,enc(record));fsyncSync(fd)}finally{closeSync(fd)}
  if(cut==='before-link')process.kill(process.pid,'SIGKILL');
  // No replace: competing writers for the same slot cannot overwrite one another.
  try{linkSync(temp,path);syncDir()}catch(e){try{unlinkSync(temp)}catch{}throw e}
  if(cut==='after-durable-link')process.kill(process.pid,'SIGKILL');
  unlinkSync(temp);syncDir();
  console.log(JSON.stringify({sequence,head:anchor.body.head,witnessHead:hash(record),state,duplicate:false}));
 }
}else fail('command');
