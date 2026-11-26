import {generateKeyPairSync,sign,verify as verifySignature,createHash,randomUUID} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,openSync,closeSync,fsyncSync,renameSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {replay} from './phi022-protocol.mjs';
const keys=Object.fromEntries(['operator','evaluator'].map(role=>[role,generateKeyPairSync('ed25519')]));
const signAs=(role,value)=>sign(null,Buffer.from(JSON.stringify(value)),keys[role].privateKey).toString('base64');
const verify=(role,value,sig)=>typeof sig==='string'&&sig.length<=128&&verifySignature(null,Buffer.from(JSON.stringify(value)),keys[role].publicKey,Buffer.from(sig,'base64'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const session=randomUUID(),dir=mkdtempSync(join(tmpdir(),'phi022-')),path=join(dir,'journal.json');
const state=events=>replay(events,verify,session);
let pin=null;
function persist(events){
 state(events);
 const bytes=JSON.stringify({session,events});
 const temp=path+'.next';const fd=openSync(temp,'wx',0o600);
 try{writeFileSync(fd,bytes);fsyncSync(fd)}finally{closeSync(fd)}
 renameSync(temp,path);
 const parent=openSync(dirname(path),'r');try{fsyncSync(parent)}finally{closeSync(parent)}
 return hash(bytes);
}
function load(expected){
 const bytes=readFileSync(path,'utf8');if(bytes.length>128*1024||hash(bytes)!==expected)throw Error('pin mismatch');
 const journal=JSON.parse(bytes);if(journal.session!==session)throw Error('session mismatch');state(journal.events);return journal.events;
}
function append(event){const events=pin===null?[]:load(pin);events.push(event);pin=persist(events);return state(events)}
function evaluate(p){
 const child=spawnSync(process.execPath,[fileURLToPath(new URL('./phi022-evaluator.mjs',import.meta.url))],{input:JSON.stringify({proposal:p,key:keys.evaluator.privateKey.export({type:'pkcs8',format:'pem'})}),encoding:'utf8',timeout:3000,maxBuffer:16384,env:{}});
 if(child.status!==0||child.error)throw Error('evaluator failure');return JSON.parse(child.stdout);
}
try{
 const p={kind:'proposal',id:1,session,parent:0,weights:[8,0,8],mode:'learn',sources:[],budget:972};
 assert.equal(append(p).charged,972);
 const prefix=readFileSync(path,'utf8');
 const receipt=evaluate(p);
 assert.equal(receipt.metrics.cost,972);
 assert.deepEqual(receipt.metrics.candidate,[9,9,9]);
 assert.throws(()=>state([p,{...receipt,metrics:{...receipt.metrics,cost:1}}]));
 assert.deepEqual(append(receipt).shadow,[4,4,4]);
 const decision={kind:'decision',choice:'approve',signature:signAs('operator',[p,receipt,'approve'])};
 assert.throws(()=>state([p,receipt,{...decision,signature:signAs('evaluator',[p,receipt,'approve'])}]));
 assert.deepEqual(append(decision).shadow,[8,0,8]);
 assert.deepEqual(state(load(pin)).production,[4,4,4]);
 assert.throws(()=>state([...load(pin),decision]));
 const q={...p,id:2,parent:1,weights:[4,4,4],mode:'recall',sources:[0]};
 assert.equal(append(q).charged,1944);
 const qReceipt=evaluate(q);append(qReceipt);
 assert.throws(()=>state([...load(pin),{kind:'decision',choice:'approve',signature:signAs('operator',[q,qReceipt,'approve'])}]));
 append({kind:'decision',choice:'reject',signature:signAs('operator',[q,qReceipt,'reject'])});
 assert.deepEqual(state(load(pin)).shadow,[8,0,8]);
 const c={...p,id:3,parent:1,weights:[8,4,8],mode:'compose',sources:[1,0,1]};
 assert.equal(append(c).charged,2916);
 // Simulated interruption: reservation survives, only operator rejection can close it.
 assert.equal(state(load(pin)).pending.proposal.id,3);
 append({kind:'decision',choice:'reject',signature:signAs('operator',[c,null,'reject'])});
 assert.equal(state(load(pin)).pending,null);
 const current=readFileSync(path,'utf8');
 writeFileSync(path,prefix);assert.throws(()=>load(pin));
 writeFileSync(path,current+' ');assert.throws(()=>load(pin));
 writeFileSync(path,current);assert.equal(state(load(pin)).attempts,3);
 console.log(JSON.stringify({status:'passed',scope:'local governance integration',metrics:receipt.metrics,attempts:3,production:[4,4,4]}));
}finally{rmSync(dir,{recursive:true,force:true})}
