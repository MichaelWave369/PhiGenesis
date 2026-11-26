import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {run} from '../../experiments/phi030-memory.mjs';
import {createJournal,openJournal} from '../../runtime/journal-disk-v10-rc2.mjs';
import {VERSION,BUDGET,UNITS,hash,zero,replay,classify} from '../../runtime/cycle3/protocol.mjs';

const header=()=>({kind:'header',schema:VERSION,session:'00000000-0000-4000-8000-000000000000',sourceHash:'a'.repeat(64),authority:'NONE',budget:{...BUDGET}});
const event=(kind,more={})=>({schema:VERSION,authority:'NONE',kind,id:1,...more});
const reserve=()=>event('reserve',{stage:'memory',inputHash:hash(null),budget:{...BUDGET}});
const artifact={schema:'cycle3-memory/v1',authority:'NONE',snapshot:run(7,'delayed','context-tagged',24)};
const result=()=>{
  const measured={...zero(),workerCalls:1,fixtureRows:1296,comparisons:6528};
  return event('result',{artifact:structuredClone(artifact),artifactHash:hash(artifact),measured,
    byCategory:classify('memory',measured,null,artifact),diagnostics:{elapsedMicros:10,requestBytes:1,responseBytes:1}});
};
const complete=()=>[header(),reserve(),event('start'),result()];
const conservation=s=>{for(const k of UNITS)assert.equal(s.totals.reserved[k],
  s.totals.measured[k]+s.totals.uncertain[k]+s.totals.unused[k]+s.totals.open[k]);};

test('completed actual legacy snapshot replays deterministically with no authority',()=>{
  const s=replay(complete());
  assert.deepEqual(s,replay(JSON.parse(JSON.stringify(complete()))));
  assert.equal(s.next,1);assert.equal(s.authority,'NONE');assert.equal(s.release,'BLOCKED');
  assert.deepEqual(s.production,[4,4,4]);conservation(s);
  assert.equal(s.byCategory.observation.fixtureRows,432);
  assert.equal(s.byCategory.evaluation.fixtureRows,864);
});
test('category relabeling cannot conceal verification or evaluation work',()=>{
  const r=result();r.byCategory.observation.comparisons=6528;r.byCategory.evaluation.comparisons=0;
  assert.throws(()=>replay([header(),reserve(),event('start'),r]));
});
test('unstarted and started reservations remain distinct across serialization',()=>{
  const a=replay([header(),reserve()]),b=replay([header(),reserve(),event('start')]);
  assert.equal(a.totals.open.comparisons,BUDGET.comparisons);
  assert.equal(a.totals.uncertain.comparisons,0);
  assert.equal(b.totals.uncertain.comparisons,BUDGET.comparisons);
  assert.equal(b.totals.measured.comparisons,0);conservation(a);conservation(b);
});
test('explicit abandonment is terminal and preserves uncertainty',()=>{
  for(const started of [false,true]){
    const records=[header(),reserve(),...(started?[event('start')]:[]),event('abandon',{reason:'operator discarded incomplete run'})];
    const s=replay(records);conservation(s);
    assert.equal(s.abandoned,true);assert.equal(s.pending,null);
    assert.equal(s.totals[started?'uncertain':'unused'].comparisons,BUDGET.comparisons);
    assert.throws(()=>replay([...records,reserve()]));
  }
});
test('duplicate admission, start, result and skipped stage fail closed',()=>{
  assert.throws(()=>replay([header(),reserve(),reserve()]));
  assert.throws(()=>replay([header(),reserve(),event('start'),event('start')]));
  assert.throws(()=>replay([...complete(),result()]));
  assert.throws(()=>replay([header(),{...reserve(),stage:'plan'}]));
  assert.throws(()=>replay([header(),reserve(),result()]));
});
test('schema, unknown fields, authority and input substitution are refused',()=>{
  for(const h of [{...header(),schema:'future'}, {...header(),authority:'LIVE'}, {...header(),permission:'execute'}])assert.throws(()=>replay([h]));
  for(const r of [{...reserve(),inputHash:'b'.repeat(64)}, {...reserve(),permissions:[]}, {...reserve(),authority:'LIVE'}])assert.throws(()=>replay([header(),r]));
});
test('all resource dimensions reject negative, noninteger, unsafe, NaN and over-budget measurements',()=>{
  for(const unit of UNITS)for(const n of [-1,0.5,Number.MAX_SAFE_INTEGER+1,NaN,BUDGET[unit]+1]){
    const r=result();r.measured[unit]=n;
    assert.throws(()=>replay([header(),reserve(),event('start'),r]));
  }
  const r=result();r.measured.extra=0;
  assert.throws(()=>replay([header(),reserve(),event('start'),r]));
});
test('artifact modifications fail even when unrelated metrics stay plausible',()=>{
  const r=result();r.artifact.snapshot.memory[0].label=9;
  assert.throws(()=>replay([header(),reserve(),event('start'),r]));
  r.artifactHash=hash(r.artifact);r.artifact.snapshot.authority='EXECUTE';r.artifactHash=hash(r.artifact);
  assert.throws(()=>replay([header(),reserve(),event('start'),r]));
});
test('durable storage authenticates bytes and refuses fragments and wrong keys',()=>{
  const dir=mkdtempSync(join(tmpdir(),'cycle3-store-')),path=join(dir,'journal'),key=randomBytes(32);
  try{
    const j=createJournal(path,key,header());j.append(reserve());
    const original=readFileSync(path),pin=j.head;
    assert.throws(()=>openJournal(path,randomBytes(32)));
    writeFileSync(path,Buffer.concat([original,Buffer.from('{partial')]));
    assert.throws(()=>openJournal(path,key));
    writeFileSync(path,original);
    const changed=original.toString().replace('memory','recall');writeFileSync(path,changed);
    assert.throws(()=>openJournal(path,key));
    writeFileSync(path,original.toString().split('\n')[0]+'\n');
    // Negative result: the same valid prefix is readable without an external pin.
    assert.equal(openJournal(path,key).records.length,1);
    assert.throws(()=>openJournal(path,key,{expectedHead:pin}));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
