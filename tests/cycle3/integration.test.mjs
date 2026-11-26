import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {spawnSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {VERSION,BUDGET,STAGES,hash} from '../../runtime/cycle3/protocol.mjs';
import {inspect,fullArtifact} from '../../runtime/cycle3/session.mjs';

const configPath=process.env.PHIGENESIS_CYCLE3_CONFIG;
const cli=fileURLToPath(new URL('../../runtime/cycle3/cli.mjs',import.meta.url));
const crash=fileURLToPath(new URL('./crash-child.mjs',import.meta.url));
const cwd=resolve(fileURLToPath(new URL('../..',import.meta.url)));
test('actual Node/SQLite/PhiOS lifecycle, cold recovery and manipulation controls',
  {skip:!configPath,timeout:180000},async t=>{
  const config=JSON.parse(readFileSync(configPath,'utf8'));
  const key=randomBytes(32),base=mkdtempSync(join(tmpdir(),'cycle3-integration-'));
  const env={...process.env,PHIGENESIS_CHECKPOINT_KEY:key.toString('hex')};delete env.PHIGENESIS_EXPECTED_MAC;
  function call(args,{ok=true,pin}={}){
    const childEnv={...env};if(pin)childEnv.PHIGENESIS_EXPECTED_MAC=pin;
    const p=spawnSync(process.execPath,[cli,...args],{cwd,env:childEnv,encoding:'utf8',timeout:30000,maxBuffer:1000000});
    if(ok)assert.equal(p.status,0,p.stderr);else assert.notEqual(p.status,0);
    return p.status===0 ? JSON.parse(p.stdout) : JSON.parse(p.stderr);
  }
  function init(name){const dir=join(base,name);call(['init',dir,configPath]);return dir;}
  function sql(dir,statement){
    const code='import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute(sys.argv[2]); c.commit()';
    const p=spawnSync(config.python,['-I','-c',code,join(dir,'draft.sqlite3'),statement],{encoding:'utf8'});
    assert.equal(p.status,0,p.stderr);
  }
  async function killAt(dir,boundary){
    const child=spawn(process.execPath,[crash,dir,boundary],{cwd,env,stdio:['ignore','ignore','pipe']});
    let stderr='';child.stderr.on('data',b=>stderr+=b);
    const exit=once(child,'exit');
    const deadline=Date.now()+20000;
    try{
      while(!existsSync(join(dir,'test-boundary'))){
        assert.equal(child.exitCode,null,stderr);
        assert.ok(Date.now()<deadline,'crash boundary timeout');
        await new Promise(r=>setTimeout(r,10));
      }
      child.kill('SIGKILL');const [,signal]=await exit;assert.equal(signal,'SIGKILL');
    }finally{if(child.exitCode===null && child.signalCode===null)child.kill('SIGKILL');}
  }
  let first,second,finalA;
  try{
    await t.test('two fresh sessions produce identical artifacts and native denial',()=>{
      first=init('run-a');second=init('run-b');
      const a=[],b=[];
      for(const [dir,list] of [[first,a],[second,b]])for(const _ of STAGES)list.push(call(['next',dir]));
      finalA=a.at(-1);const finalB=b.at(-1);
      assert.equal(finalA.status,'COMPLETED_RESEARCH_ONLY');assert.equal(finalA.release,'BLOCKED');
      assert.equal(finalA.authority,'NONE');assert.deepEqual(finalA.production,[4,4,4]);
      assert.notEqual(finalA.session,finalB.session);assert.deepEqual(finalA.artifacts,finalB.artifacts);
      assert.equal(finalA.totals.measured.comparisons,19644);
      assert.equal(finalA.totals.measured.interpreterFuel,66);
      assert.equal(finalA.totals.measured.fixtureRows,3888);
      assert.equal(finalA.totals.measured.sqlStatements,274);
      assert.equal(finalA.byCategory.observation.fixtureRows,432);
      assert.equal(finalA.byCategory.evaluation.fixtureRows,864);
      assert.equal(finalA.byCategory.verification.fixtureRows,2592);
      assert.equal(finalA.byCategory.memory.comparisons,30);
      assert.equal(finalA.byCategory.interpreter.interpreterFuel,33);
      assert.equal(finalA.byCategory.verification.interpreterFuel,33);
      assert.equal(finalA.journal.records,19);assert.ok(finalA.draftDatabaseBytes>0);
      const native=fullArtifact(first,key,'replay');assert.equal(native.permission.allowed,false);
      assert.deepEqual(native.permission.granted,[]);assert.equal(native.verified,true);
      for(const dir of [first,second]){
        const before=readFileSync(join(dir,'research.journal'));
        call(['next',dir],{ok:false});call(['start',dir],{ok:false});
        assert.deepEqual(readFileSync(join(dir,'research.journal')),before);
      }
    });
    await t.test('two cold inspections do no work and retain the external checkpoint pin',()=>{
      const journal=readFileSync(join(first,'research.journal')),db=readFileSync(join(first,'draft.sqlite3'));
      const a=call(['inspect',first],{pin:finalA.head}),b=call(['inspect',first],{pin:finalA.head});
      assert.deepEqual(a,b);assert.equal(a.journal.externalHeadPin,true);
      assert.deepEqual(readFileSync(join(first,'research.journal')),journal);
      assert.deepEqual(readFileSync(join(first,'draft.sqlite3')),db);
      call(['inspect',first],{ok:false,pin:'0'.repeat(64)});
    });
    await t.test('session policy/config drift is refused before a new reservation',()=>{
      const dir=join(base,'config-drift');cpSync(first,dir,{recursive:true});
      const path=join(dir,'config.json'),c=JSON.parse(readFileSync(path,'utf8'));
      c.authority='EXECUTE';writeFileSync(path,JSON.stringify(c));
      call(['inspect',dir],{ok:false});
    });
    await t.test('real database permission drift is refused by native draft inspection',()=>{
      const dir=init('database-drift');for(let i=0;i<4;i++)call(['next',dir]);
      sql(dir,'UPDATE agenthandoff SET allow_memory=1');
      const refusal=call(['next',dir],{ok:false});assert.match(refusal.reason,/handoff scope/);
      const state=call(['inspect',dir]);assert.equal(state.pending.stage,'review');
      assert.equal(state.totals.uncertain.workerCalls,1);assert.equal(state.next,4);
      call(['abandon',dir,'native permission drift']);
    });
    await t.test('source drift fails after durable start and before the adapter',()=>{
      const dir=init('source-drift'),path=join(config.roots.Altermath,'src/causal-belt.mjs'),bytes=readFileSync(path);
      try{writeFileSync(path,Buffer.concat([bytes,Buffer.from('\n// deliberate test-only drift\n')]));
        const refusal=call(['next',dir],{ok:false});assert.match(refusal.reason,/source drift/);
      }finally{writeFileSync(path,bytes);}
      const s=call(['inspect',dir]);assert.equal(s.pending.started,true);assert.equal(s.next,0);
      assert.equal(s.totals.measured.workerCalls,0);call(['abandon',dir,'source drift']);
    });
    await t.test('actual process kill after reservation preserves unused work',async()=>{
      const dir=init('kill-reserved');await killAt(dir,'reserved');
      const a=call(['inspect',dir]),b=call(['inspect',dir]);assert.deepEqual(a,b);
      assert.equal(a.pending.started,false);assert.equal(a.totals.open.workerCalls,1);
      call(['next',dir],{ok:false});
      const done=call(['abandon',dir,'killed before start']);assert.equal(done.totals.unused.workerCalls,1);
      assert.deepEqual(done.totals.uncertain.workerCalls,0);call(['next',dir],{ok:false});
    });
    await t.test('actual process kill after start requires explicit stale-lock recovery',async()=>{
      const dir=init('kill-start');call(['reserve',dir]);await killAt(dir,'start');
      const a=call(['inspect',dir]);assert.equal(a.pending.started,true);assert.ok(a.lock);
      call(['start',dir],{ok:false});call(['unlock',dir,'0'.repeat(64)],{ok:false});
      call(['unlock',dir,a.lock.sha256]);
      const done=call(['abandon',dir,'killed after durable start']);
      assert.equal(done.totals.uncertain.workerCalls,1);assert.equal(done.totals.measured.workerCalls,0);
    });
    await t.test('completed unrecorded SQLite work stays uncertain and cannot be readmitted',async()=>{
      const dir=init('kill-result');for(let i=0;i<3;i++)call(['next',dir]);call(['reserve',dir]);
      await killAt(dir,'worker-result');assert.ok(existsSync(join(dir,'draft.sqlite3')));
      const db=readFileSync(join(dir,'draft.sqlite3')),a=call(['inspect',dir]),b=call(['inspect',dir]);
      assert.deepEqual(a,b);assert.equal(a.pending.stage,'plan');assert.equal(a.next,3);
      assert.equal(a.totals.measured.sqlStatements,0);assert.equal(a.totals.uncertain.sqlStatements,BUDGET.sqlStatements);
      call(['unlock',dir,a.lock.sha256]);call(['start',dir],{ok:false});call(['next',dir],{ok:false});
      const done=call(['abandon',dir,'completed unrecorded draft quarantined']);
      call(['abandon',dir,'idempotent recovery']);call(['next',dir],{ok:false});
      assert.equal(done.authority,'NONE');assert.deepEqual(readFileSync(join(dir,'draft.sqlite3')),db);
    });
    await t.test('live command and release gate refuse with or without a session',()=>{
      call(['execute',first],{ok:false});call(['promote',first],{ok:false});
      const p=spawnSync(process.execPath,[cli,'gate'],{cwd,encoding:'utf8'});
      assert.equal(p.status,1);const gate=JSON.parse(p.stdout);assert.equal(gate.release,'BLOCKED');
    });
  }finally{rmSync(base,{recursive:true,force:true});}
});
