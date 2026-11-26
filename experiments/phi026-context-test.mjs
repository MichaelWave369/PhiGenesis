import {generateKeyPairSync,createHash,sign,verify,randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {replay} from './phi026-protocol.mjs';
import {plan} from './phi025-planner.mjs';
const roles=['context','operator','evaluator'],keys=Object.fromEntries(roles.map(r=>[r,generateKeyPairSync('ed25519')])),trust=Object.fromEntries(roles.map(r=>[r,keys[r].publicKey.export({type:'spki',format:'pem'})]));
const session=randomUUID(),enc=x=>Buffer.from(JSON.stringify(x)),hash=x=>createHash('sha256').update(enc(x)).digest('hex');
const env={session,hash,verify:(role,b,s)=>verify(null,enc(b),keys[role].publicKey,Buffer.from(s,'base64'))};
const signed=(kind,role,body)=>({kind,body,signature:sign(null,enc(body),keys[role].privateKey).toString('base64')});
const dir=mkdtempSync(join(tmpdir(),'phi026-')),keyPath=join(dir,'evaluator.pem');writeFileSync(keyPath,keys.evaluator.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
let events=[],checks=0;
const append=e=>{const next=[...events,e],state=replay(next,env);events=next;checks++;return state};
const ctx=(epoch,world,seed,salt)=>signed('context','context',{session,epoch,world,suite:'phi026-eval-v1',commitment:hash([session,epoch,world,seed,salt])});
function evaluate(context,proposal,seed,salt,ok=true){
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('./phi026-evaluator.mjs',import.meta.url))],{input:JSON.stringify({context,proposal,trust,seed,salt,keyPath}),encoding:'utf8',timeout:5000,maxBuffer:16384});
 if(!ok){assert.notEqual(r.status,0);assert.equal(r.signal,null);checks++;return}
 assert.equal(r.status,0,r.stderr);checks++;return JSON.parse(r.stdout);
}
try{
 const salt1=randomBytes(32).toString('hex'),salt2=randomBytes(32).toString('hex'),c1=ctx(1,'aligned',27186,salt1),c2=ctx(2,'shifted',27187,salt2);
 for(const [context,seed,salt,expected] of [[c1,27186,salt1,[8,0,8]],[c2,27187,salt2,[0,8,0]]]){
  let state=append(context);const advice=plan(state,1,context.body.world);
  assert.deepEqual(advice.proposal.weights,expected);checks++;
  const p=signed('proposal','operator',{session,id:state.attempts+1,parent:state.nodes.length-1,context:hash(context),incumbent:state.shadow,...advice.proposal,budget:2592});append(p);
  assert.throws(()=>replay([...events,ctx(context.body.epoch+1,'shifted',seed,salt)],env));checks++;
  evaluate(context,p,seed+7,salt,false);evaluate(context,p,seed,salt+'x',false);
  const r=evaluate(context,p,seed,salt);
  assert.throws(()=>replay([...events,{...r,body:{...r.body,cost:1}}],env));checks++;
  append(r);
  const decision=signed('decision','operator',{session,proposal:hash(p),receipt:hash(r),choice:'approve'});state=append(decision);
  assert.deepEqual(state.shadow,expected);assert.deepEqual(state.production,[4,4,4]);checks+=2;
 }
 const end=replay(events,env);assert.equal(end.charged,5184);assert.equal(end.closed.length,2);checks+=2;
 console.log(JSON.stringify({status:'passed',checks,metrics:events.filter(e=>e.kind==='receipt').map(e=>e.body),shadow:end.shadow,production:end.production,charged:end.charged}));
}finally{rmSync(dir,{recursive:true,force:true})}
