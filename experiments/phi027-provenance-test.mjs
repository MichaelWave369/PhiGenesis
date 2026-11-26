import {generateKeyPairSync,createHash,sign,verify,randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {replay as legacyReplay} from './phi026-protocol.mjs';
import {plan} from './phi025-planner.mjs';
import {replay,makeDiscovery,domain} from './phi027-provenance.mjs';
const roles=['context','operator','evaluator','planner'],keys=Object.fromEntries(roles.map(r=>[r,generateKeyPairSync('ed25519')])),trust=Object.fromEntries(roles.map(r=>[r,keys[r].publicKey.export({type:'spki',format:'pem'})]));
const session=randomUUID(),enc=x=>Buffer.from(JSON.stringify(x)),hash=x=>createHash('sha256').update(enc(x)).digest('hex');
const signAs=(role,b)=>sign(null,enc(b),keys[role].privateKey).toString('base64');
const env={session,hash,plan,replay:legacyReplay,verify:(role,b,s)=>typeof s==='string'&&verify(null,enc(b),keys[role].publicKey,Buffer.from(s,'base64'))};
const signed=(kind,role,body,wrapped=false)=>({kind,body,signature:signAs(role,wrapped?domain(kind,body):body)});
const dir=mkdtempSync(join(tmpdir(),'phi027-')),keyPath=join(dir,'evaluator.pem');writeFileSync(keyPath,keys.evaluator.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
let events=[],checks=0;
const append=e=>{const next=[...events,e],result=replay(next,env);events=next;checks++;return result};
const deny=e=>{assert.throws(()=>replay([...events,e],env));checks++};
const ctx=(epoch,world,seed,salt)=>signed('context','context',{session,epoch,world,suite:'phi026-eval-v1',commitment:hash([session,epoch,world,seed,salt])});
function evaluate(context,proposal,seed,salt){
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('./phi026-evaluator.mjs',import.meta.url))],{input:JSON.stringify({context,proposal,trust,seed,salt,keyPath}),encoding:'utf8',timeout:5000,maxBuffer:16384});
 assert.equal(r.status,0,r.stderr);checks++;return JSON.parse(r.stdout);
}
try{
 for(const [epoch,world,seed,expected] of [[1,'aligned',27186,[8,0,8]],[2,'shifted',27187,[0,8,0]]]){
  const salt=randomBytes(32).toString('hex'),context=ctx(epoch,world,seed,salt),before=append(context);
  const d=makeDiscovery(events,env,1,'hybrid',signAs);assert.deepEqual(d.body.proposal.weights,expected);checks++;
  // A correctly signed false report or false cost is still rejected by deterministic replay.
  deny(signed('discovery','planner',{...d.body,targetCost:d.body.targetCost-1},true));
  deny(signed('discovery','planner',{...d.body,reportHash:'0'.repeat(64)},true));
  deny(signed('discovery','operator',d.body,true));
  append(d);deny(d);
  const p=signed('proposal','operator',{session,id:before.state.attempts+1,parent:before.state.nodes.length-1,context:hash(context),incumbent:before.state.shadow,...d.body.proposal,budget:2592});
  deny(p);
  const other=signed('proposal','operator',{...p.body,weights:[4,0,8]});
  deny(signed('submit','operator',{session,discovery:hash(d),proposal:other},true));
  append(signed('submit','operator',{session,discovery:hash(d),proposal:p},true));
  const r=evaluate(context,p,seed,salt);append(r);
  const decision=signed('decision','operator',{session,proposal:hash(p),receipt:hash(r),choice:'approve'}),after=append(decision);
  assert.deepEqual(after.state.shadow,expected);assert.equal(after.lineage.at(-1).node,epoch);assert.equal(after.lineage.at(-1).receipt,hash(r));checks+=3;
 }
 // A no-candidate result is still charged; search a deterministic fixture that exercises it.
 const before=replay(events,env),d=makeDiscovery(events,env,1,'local',signAs);
 assert.equal(d.body.proposal,null);checks++;
 const end=append(d);
 assert.equal(end.discoveries.at(-1).outcome,'no-candidate');assert.equal(end.lineage.length,2);assert.deepEqual(end.state.production,[4,4,4]);assert.equal(end.reservedEvaluationComparisons,5184);assert.equal(end.planningComparisons,before.planningComparisons+d.body.targetCost+d.body.sourceCost);checks+=5;
 assert.deepEqual(replay(JSON.parse(JSON.stringify(events)),env),end);checks++;
 console.log(JSON.stringify({status:'passed',checks,planningComparisons:end.planningComparisons,reservedEvaluationComparisons:end.reservedEvaluationComparisons,discoveries:end.discoveries,lineage:end.lineage,production:end.state.production}));
}finally{rmSync(dir,{recursive:true,force:true})}
