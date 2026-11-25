import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {initJournal,openJournal} from './journal-disk-v10-rc2.mjs';
import {fold,reconstruct,recover,run} from './journal-v10-rc2.mjs';
import * as core from './field-v10-rc1.mjs';
const {peerAPI,previous}=core,key=Buffer.alloc(32,9);
const [mode,path,phase,opKind]=process.argv.slice(2);
if(mode==='worker'){
 const j=openJournal(path,key),s=reconstruct(core,peerAPI,previous,j.records).state,p=core.environment(s.seed,s.events.length,false,false).provider;
 const hit=(name)=>appendFileSync(path+'.calls',name+'\n');
 run(core,peerAPI,previous,j,{observe(...a){hit('observation');return p.observe(...a);},anchors(...a){hit('calibration');return p.anchors(...a);},transport(...a){hit('packet');return p.transport(...a);}},192,(name,meta)=>{
  if(name===phase&&(!opKind||meta.request?.kind===opKind))process.kill(process.pid,'SIGKILL');
 });
 process.exit(0);
}
const root=mkdtempSync(join(tmpdir(),'phi-rc2-')),rows=[];
try{
 const cases=[['after-begin','', 'cold'],['after-reserve','observation','cold'],['after-invoke','observation','cold'],['after-result','observation','cold'],['before-commit','','cold'],['after-commit','','cold'],['after-reserve','calibration','peer'],['after-invoke','calibration','peer'],['after-result','calibration','peer'],['after-reserve','packet','peer'],['after-invoke','packet','peer'],['after-result','packet','peer']];
 for(const [i,[phase,kind,method]] of cases.entries()){
  const p=join(root,'case'+i);initJournal(p,key,123,method);writeFileSync(p+'.calls','');
  const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'worker',p,phase,kind],{encoding:'utf8',timeout:30000});
  assert.equal(child.signal,'SIGKILL',child.stderr);
  const j=openJournal(p,key),before=fold(j.records),calls=readFileSync(p+'.calls','utf8');
  const pending=before.active?.ops.at(-1),committed=phase==='after-commit';
  if(committed)assert.equal(before.events.length,1);else assert.ok(before.active);
  if(phase==='after-reserve'||phase==='after-invoke')assert.equal(pending.result,null);
  if(phase==='after-result')assert.ok(pending.result);
  const f=recover(j),a=f.attempts[0];
  assert.equal(f.events.length,committed?1:0);assert.equal(a.status,committed?'accepted':'crash-abandoned');
  assert.equal(a.cost.total,a.cost.completed+a.cost.uncertain);
  assert.equal(readFileSync(p+'.calls','utf8'),calls);
  const count=j.records.length;recover(j);assert.equal(j.records.length,count);
  const reopened=openJournal(p,key);assert.deepEqual(reconstruct(core,peerAPI,previous,reopened.records).folded,f);
  if(!committed){const s=run(core,peerAPI,previous,reopened,core.environment(123,0,false,false).provider);assert.equal(s.events[0].status,'accepted');assert.equal(fold(reopened.records).attempts.length,2);}
  rows.push({phase,kind:kind||null,method,status:a.status,attempted:a.cost.total,completed:a.cost.completed,uncertain:a.cost.uncertain,providerCalls:calls.trim()?calls.trim().split('\n').length:0});
 }
 const p=join(root,'tamper');let j=initJournal(p,key,123,'cold');const head=j.head;run(core,peerAPI,previous,j,core.environment(123,0).provider);
 assert.throws(()=>openJournal(p,key,{expectedHead:head}));
 assert.throws(()=>openJournal(p,Buffer.alloc(32,8)));
 const pristine=readFileSync(p,'utf8');appendFileSync(p,'partial');assert.throws(()=>openJournal(p,key));
 j=openJournal(p,key,{repairTail:true});assert.equal(j.discardedTailBytes,7);assert.equal(readFileSync(p,'utf8'),pristine);
 const lines=pristine.trimEnd().split('\n');[lines[1],lines[2]]=[lines[2],lines[1]];writeFileSync(p,lines.join('\n')+'\n');assert.throws(()=>openJournal(p,key,{repairTail:true}));
 console.log(JSON.stringify({crashCases:rows,additionalChecks:5},null,2));
}finally{rmSync(root,{recursive:true,force:true});}
