import {createHash,createPrivateKey,createPublicKey,sign,verify as verifySig,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,openSync,closeSync,fsyncSync,renameSync,linkSync,unlinkSync,statSync,mkdirSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {replay} from './phi023-protocol.mjs';
const [command,store,trustPath,anchorPath,keyPath,arg]=process.argv.slice(2);
const fail=m=>{throw Error(m)};
if(!command||!store||!trustPath||!anchorPath)fail('usage: command store trust anchor [role-key] [json]');
const hash=x=>createHash('sha256').update(x).digest('hex'),enc=x=>Buffer.from(JSON.stringify(x));
function read(path,limit=131072){if(statSync(path).size>limit)fail('size');return readFileSync(path)}
const trust=JSON.parse(read(trustPath,8192));
if(typeof trust.session!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(trust.session))fail('session');
const keys={operator:createPublicKey(trust.operator),evaluator:createPublicKey(trust.evaluator)};
const fingerprint=k=>hash(k.export({type:'spki',format:'der'}));
if(Object.values(keys).some(k=>k.asymmetricKeyType!=='ed25519')||fingerprint(keys.operator)===fingerprint(keys.evaluator))fail('distinct Ed25519 keys required');
const trustId=hash(enc([trust.session,fingerprint(keys.operator),fingerprint(keys.evaluator)]));
const verify=(role,v,s)=>typeof s==='string'&&s.length<=128&&verifySig(null,enc(v),keys[role],Buffer.from(s,'base64'));
function roleKey(role){const key=createPrivateKey(read(keyPath,8192));if(key.asymmetricKeyType!=='ed25519'||fingerprint(createPublicKey(key))!==fingerprint(keys[role]))fail('wrong role key');return key}
const signWith=(k,v)=>sign(null,enc(v),k).toString('base64');
function syncDir(dir){const fd=openSync(dir,'r');try{fsyncSync(fd)}finally{closeSync(fd)}}
function stage(path,bytes,replace){
 const temp=path+'.'+randomUUID()+'.next',fd=openSync(temp,'wx',0o600);
 try{writeFileSync(fd,bytes);fsyncSync(fd)}finally{closeSync(fd)}
 try{if(replace)renameSync(temp,path);else{linkSync(temp,path);unlinkSync(temp)}syncDir(dirname(path))}
 catch(e){try{unlinkSync(temp)}catch{}throw e}
}
function load(){
 const anchor=JSON.parse(read(anchorPath,8192)),{body,signature}=anchor;
 if(!body||body.trust!==trustId||!Number.isInteger(body.count)||body.count<0||body.count>54||!/^[a-f0-9]{64}$/.test(body.head)||!verify('operator',body,signature))fail('anchor');
 const bytes=read(join(store,body.head+'.json'));if(hash(bytes)!==body.head)fail('snapshot hash');
 const snap=JSON.parse(bytes);if(snap.trust!==trustId||!Array.isArray(snap.events)||snap.events.length!==body.count)fail('snapshot binding');
 return {anchor,events:snap.events,state:replay(snap.events,verify,trust.session)};
}
function commit(events,key,previous){
 const state=replay(events,verify,trust.session),bytes=enc({trust:trustId,events}),head=hash(bytes),path=join(store,head+'.json');
 try{stage(path,bytes,false)}catch(e){if(e.code!=='EEXIST'||!read(path).equals(bytes))throw e}
 const body={trust:trustId,count:events.length,head},anchor={body,signature:signWith(key,body)};
 // A single trusted writer owns the anchor. Check current anchor again before advancing.
 if(previous!==null&&load().anchor.body.head!==previous)fail('stale head');
 stage(anchorPath,enc(anchor),previous!==null);
 return {head,state};
}
let out;
if(command==='init'){
 const key=roleKey('operator');mkdirSync(store,{recursive:true,mode:0o700});out=commit([],key,null);
}else{
 const current=load(),s=current.state,events=current.events.slice();
 if(command==='inspect')out={head:current.anchor.body.head,state:s};
 else if(command==='evaluate'){
  if(!s.pending||s.pending.receipt)fail('no unevaluated reservation');
  roleKey('evaluator');const child=spawnSync(process.execPath,[fileURLToPath(new URL('./phi023-evaluator.mjs',import.meta.url))],{input:JSON.stringify({proposal:s.pending.proposal,keyPath:resolve(keyPath)}),encoding:'utf8',timeout:3000,maxBuffer:16384,env:{}});
  if(child.status!==0||child.error)fail('evaluator failed');
  const receipt=JSON.parse(child.stdout);replay([...events,receipt],verify,trust.session);out=receipt;
 }else{
  const key=roleKey('operator');
  if(command==='propose'){
   const input=JSON.parse(arg);
   if(!input||Object.keys(input).sort().join(',')!=='mode,sources,weights')fail('proposal input');
   events.push({kind:'proposal',id:s.attempts+1,session:s.session,parent:s.nodes.length-1,incumbent:s.shadow,weights:input.weights,mode:input.mode,sources:input.sources,budget:1458});
  }else if(command==='record'){events.push(JSON.parse(arg));if(events.at(-1)?.kind!=='receipt')fail('receipt only')}
  else if(command==='decide'){
   if(!s.pending||!['approve','reject','abandon'].includes(arg))fail('decision');
   events.push({kind:'decision',choice:arg,signature:signWith(key,[s.pending.proposal,s.pending.receipt,arg])});
  }else fail('unknown command');
  out=commit(events,key,current.anchor.body.head);
 }
}
console.log(JSON.stringify(out));
