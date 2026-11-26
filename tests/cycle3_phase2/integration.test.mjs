import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,cpSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,generateKeyPairSync} from 'node:crypto';
import {spawnSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {hash} from '../../runtime/cycle3/protocol.mjs';
import {replaySession,ACTIVITY_UNITS} from '../../runtime/cycle3/activities.mjs';
import {initialize,advance,inspect,fullArtifact,performActivity,protectedRead,reserveActivity,startActivity,abandon,unlock} from '../../runtime/cycle3/session.mjs';
import {referenceWitness,TRUST} from '../../runtime/cycle3/continuity.mjs';
import {seedGenome} from '../../runtime/cycle3/genome.mjs';

const configPath=process.env.PHIGENESIS_PHASE2_CONFIG;
const cli=fileURLToPath(new URL('../../runtime/cycle3/cli.mjs',import.meta.url));
const crash=fileURLToPath(new URL('./activity-crash-child.mjs',import.meta.url));
const fixtures=fileURLToPath(new URL('.',import.meta.url));
test('v2 uses original session engine for real native memory, finite genome and signed continuity',
 {skip:!configPath,timeout:150000},async t=>{
  const config=JSON.parse(readFileSync(configPath,'utf8')),key=randomBytes(32),base=mkdtempSync(join(tmpdir(),'genesis-phase2-'));
  const env={...process.env,PHIGENESIS_CHECKPOINT_KEY:key.toString('hex')};delete env.PHIGENESIS_EXPECTED_MAC;
  const dir=join(base,'session'),template=join(base,'core-template'),wdir=join(base,'witness');
  const pair=generateKeyPairSync('ed25519'),policy={schema:TRUST,witnessId:'research-witness',epoch:1,currentKeyId:'key-1',
    keys:{'key-1':{publicKeyPem:pair.publicKey.export({type:'spki',format:'pem'}),state:'active'}}};
  let request,transport,cp1,cp2,native;
  function cold(directory){
    const p=spawnSync(process.execPath,[cli,'inspect',directory],{env,encoding:'utf8',timeout:15000,maxBuffer:2000000});
    assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);
  }
  function clone(name){const dest=join(base,name);cpSync(template,dest,{recursive:true});return dest;}
  async function killAt(directory,boundary,credentials){
    const child=spawn(process.execPath,[crash,directory,boundary,...(credentials?[credentials]:[])],{env,stdio:['ignore','ignore','pipe']});
    const ended=once(child,'exit');let err='';child.stderr.on('data',b=>err+=b);const deadline=Date.now()+15000;
    try{
      while(!existsSync(join(directory,'test-boundary'))){assert.equal(child.exitCode,null,err);assert.ok(Date.now()<deadline,'boundary timeout');await new Promise(r=>setTimeout(r,10));}
      child.kill('SIGKILL');const [,signal]=await ended;assert.equal(signal,'SIGKILL');
    }finally{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}
  }
  try{
    await t.test('explicit v2 core retains all original six operations and zero authority',()=>{
      const source=join(base,'memory.sqlite3');
      const program='import sys,json; from pathlib import Path; sys.path.insert(0,sys.argv[1]); from test_native_memory import fixture; print(json.dumps(fixture(Path(sys.argv[2]))[0]))';
      const p=spawnSync(config.python,['-I','-B','-c',program,fixtures,source],{encoding:'utf8',env:{...env,PHIGENESIS_PHASE2_NATIVE_ROOT:config.roots.PhiMemory9}});
      assert.equal(p.status,0,p.stderr);request=JSON.parse(p.stdout);
      initialize(dir,config,key);for(let i=0;i<6;i++)advance(dir,key);
      const r=inspect(dir,key);assert.equal(r.schema,'PhiGenesis.CycleIII.v2');assert.equal(r.status,'COMPLETED_RESEARCH_ONLY');
      assert.equal(r.journal.records,19);assert.equal(r.totals.measured.interpreterFuel,66);assert.equal(r.authority,'NONE');
      assert.equal(fullArtifact(dir,key,'replay').permission.allowed,false);cpSync(dir,template,{recursive:true});
    });
    await t.test('first actual anchor binds the settled core prefix',async()=>{
      transport=await referenceWitness({root:config.roots.NBGPocketMesh,directory:wdir,policy,privateKey:pair.privateKey});
      await performActivity(dir,key,'checkpoint',{policy,previous:null},{transport});
      cp1=fullArtifact(dir,key,'checkpoint').content.checkpoint;
      const r=await protectedRead(dir,key,{policy,transport});assert.equal(r.protectedRecords,19);assert.equal(r.unprotectedTailRecords,3);
    });
    await t.test('actual read-only PhiMemory9 intake is reserved/accounted and reproducible on cold inspection',async()=>{
      const bytes=readFileSync(request.databasePath);
      await performActivity(dir,key,'native-memory',request);
      native=fullArtifact(dir,key,'native-memory').content;assert.equal(native.schema,'PhiGenesis.NativeMemoryIntake.v1');
      assert.ok(native.references.some(r=>r.holds.includes('CONTRADICTORY')));assert.ok(native.references.some(r=>r.holds.includes('MISSING_SOURCE')));
      assert.deepEqual(readFileSync(request.databasePath),bytes);assert.deepEqual(cold(dir),cold(dir));
      const state=inspect(dir,key);assert.ok(state.activityTotals.measured.nativeRecords>0);assert.ok(state.activityTotals.measured.sqlStatements>0);
      for(const k of ACTIVITY_UNITS)assert.equal(state.activityTotals.reserved[k],state.activityTotals.measured[k]+state.activityTotals.unused[k]+state.activityTotals.uncertain[k]+state.activityTotals.open[k]);
    });
    await t.test('new isolated Python process reconstructs exact native provenance from the approved database',()=>{
      const worker=fileURLToPath(new URL('../../runtime/cycle3/native_worker.py',import.meta.url));
      const payload=JSON.stringify({stage:'native-memory',input:request,roots:config.roots,directory:dir});
      const result=spawnSync(config.python,['-I','-B',worker],{input:payload,encoding:'utf8',cwd:dir,timeout:15000,maxBuffer:750000});
      assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout).artifact,native);
    });
    await t.test('finite genome references actual native identities and invokes native syntax/address mappings',async()=>{
      const r=inspect(dir,key),frame={actorId:r.session,implementationHash:JSON.parse(readFileSync(join(dir,'sources.json'))).hash,controlDigest:r.sourceHash};
      const parent=seedGenome(frame,native.references);
      await performActivity(dir,key,'genome',{parent,operation:{op:'NEST',pocket:'a',parent:'b'},ancestors:[]});
      const g=fullArtifact(dir,key,'genome').content;
      assert.equal(g.candidate.actorId,r.session);assert.equal(g.mapping.pocketPaths.a,'root/b/a');
      assert.equal(g.mapping.altermathVersion,'Altermath.CausalBelt.R1');assert.equal(g.mapping.myceliumVersion,'mandelbrot-pocket-v1');
      assert.equal(g.receipt.parentDigest,hash(parent));assert.ok(inspect(dir,key).activityTotals.measured.graphVisits>0);
    });
    await t.test('second checkpoint protects native/genome inventory and refuses old prefix or substituted proof context',async()=>{
      await performActivity(dir,key,'checkpoint',{policy,previous:cp1.digest},{transport});cp2=fullArtifact(dir,key,'checkpoint').content.checkpoint;
      assert.equal(cp2.body.previous,cp1.digest);assert.ok(cp2.body.view.artifacts['native-memory']);assert.ok(cp2.body.view.artifacts.genome);
      await protectedRead(dir,key,{policy,transport});
      await assert.rejects(()=>protectedRead(dir,key,{checkpoint:cp1,policy,transport}));
      const rollback=join(base,'rollback');cpSync(dir,rollback,{recursive:true});
      const lines=readFileSync(join(rollback,'research.journal'),'utf8').trimEnd().split('\n');
      writeFileSync(join(rollback,'research.journal'),lines.slice(0,22).join('\n')+'\n');
      await assert.rejects(()=>protectedRead(rollback,key,{policy,transport}));
      const revoked=structuredClone(policy);revoked.keys['key-1'].state='revoked';
      await assert.rejects(()=>protectedRead(dir,key,{policy:revoked,transport}));
    });
    await t.test('unavailable witness refuses after durable reservation; explicit abandonment conserves uncertainty',async()=>{
      const failed=clone('unavailable');
      await assert.rejects(()=>performActivity(failed,key,'checkpoint',{policy,previous:null}));
      const before=cold(failed);assert.equal(before.pending.started,true);assert.equal(before.activityTotals.uncertain.checkpointRecords,1);
      await assert.rejects(()=>startActivity(failed,key));abandon(failed,key,'witness unavailable');
      assert.equal(inspect(failed,key).authority,'NONE');assert.equal(inspect(failed,key).activityTotals.measured.checkpointRecords,0);
    });
    await t.test('nonresponsive witness times out without claiming cancellation or measured completion',async()=>{
      const failed=clone('timeout');let signal;
      const hung={commit:async(_cp,_heads,options)=>{signal=options.signal;return new Promise(()=>{});},attest:async()=>{throw Error('must not attest after uncertain commit');}};
      await assert.rejects(()=>performActivity(failed,key,'checkpoint',{policy,previous:null},{transport:hung,timeoutMs:10}),/timeout/);
      assert.equal(signal.aborted,true);const report=inspect(failed,key);assert.equal(report.pending.started,true);
      assert.equal(report.activityTotals.uncertain.checkpointRecords,1);assert.equal(report.activityTotals.measured.checkpointRecords,0);
      abandon(failed,key,'witness completion unknown');
    });
    await t.test('actual native read interrupted before result remains uncertain and is never repeated',async()=>{
      const failed=clone('kill-native');reserveActivity(failed,key,'native-memory',request);
      await killAt(failed,'worker-result');const before=cold(failed);assert.deepEqual(before,cold(failed));
      assert.equal(before.activityTotals.measured.nativeRecords,0);assert.ok(before.activityTotals.uncertain.nativeRecords>0);
      unlock(failed,key,before.lock.sha256);await assert.rejects(()=>startActivity(failed,key));abandon(failed,key,'native read interrupted');
      assert.equal(inspect(failed,key).release,'BLOCKED');
    });
    await t.test('actual post-witness kill recovers protected prefix without inheriting authority',async()=>{
      const failed=clone('kill-checkpoint'),localWitness=join(base,'kill-witness'),credentials=join(base,'fixture-credentials.json');
      writeFileSync(credentials,JSON.stringify({directory:localWitness,policy,privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'})}),{mode:0o600});
      reserveActivity(failed,key,'checkpoint',{policy,previous:null});await killAt(failed,'witness-committed',credentials);
      const before=cold(failed);assert.equal(before.activityTotals.measured.checkpointRecords,0);
      const recovered=await referenceWitness({root:config.roots.NBGPocketMesh,directory:localWitness,policy,privateKey:pair.privateKey});
      const proof=await protectedRead(failed,key,{checkpoint:recovered.latest(),policy,transport:recovered});
      assert.equal(proof.protectedRecords,19);assert.equal(proof.executionAuthority,false);assert.equal(before.authority,'NONE');
      unlock(failed,key,before.lock.sha256);abandon(failed,key,'checkpoint reply interrupted');
      assert.equal(inspect(failed,key).activityTotals.uncertain.checkpointRecords,1);
    });
    await t.test('duplicate pending admission and altered request digest cannot enter the same journal',()=>{
      const d=clone('duplicate');reserveActivity(d,key,'native-memory',request);
      assert.throws(()=>reserveActivity(d,key,'native-memory',request));
      const records=readFileSync(join(d,'research.journal'),'utf8').trimEnd().split('\n').map(l=>JSON.parse(JSON.parse(l).payload).record);
      records.at(-1).requestDigest=hash('false');assert.throws(()=>replaySession(records));abandon(d,key,'unused duplicate guard');
    });
    await t.test('activity budgets and category tampering refuse in all new dimensions',()=>{
      const records=readFileSync(join(dir,'research.journal'),'utf8').trimEnd().split('\n').map(l=>JSON.parse(JSON.parse(l).payload).record);
      for(const unit of ACTIVITY_UNITS)for(const value of [-1,0.5,NaN,Number.MAX_SAFE_INTEGER+1]){
        const copy=structuredClone(records);copy.at(-1).measured[unit]=value;assert.throws(()=>replaySession(copy));
      }
      const forged=structuredClone(records);forged.at(-1).byCategory.storage.checkpointRecords=0;
      assert.throws(()=>replaySession(forged));
      const over=structuredClone(records);over.at(-1).measured.witnessChecks=4;assert.throws(()=>replaySession(over));
    });
  }finally{rmSync(base,{recursive:true,force:true});}
});
