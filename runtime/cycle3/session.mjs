// Single local research writer. The OS account/runtime/config remain trusted.
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,fsyncSync,unlinkSync,lstatSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createJournal,openJournal} from '../journal-disk-v10-rc2.mjs';
import {VERSION,STAGES,BUDGET,LIMITS,hash,must,exact,replay,artifactCheck,vector,uint,classify} from './protocol.mjs';
import {configCheck,sourceManifest} from './sources.mjs';

const HERE=fileURLToPath(new URL('.',import.meta.url));
function regular(path,max) {
  must(lstatSync(path).isFile() && statSync(path).size <= max,'nonregular or oversized session file');
  return readFileSync(path,'utf8');
}
function durable(path,value) {
  const fd=openSync(path,'wx',0o600);
  try {writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);} finally {closeSync(fd);}
}
function syncDir(directory) {
  const fd=openSync(directory,'r');try {fsyncSync(fd);} finally {closeSync(fd);}
}
function worker(config,directory,stage,input) {
  const request=JSON.stringify({stage,input,roots:config.roots,directory});
  const python=['preflight','plan','review','replay'].includes(stage);
  const executable=python ? config.python : process.execPath;
  const args=python ? ['-I','-B',join(HERE,'worker.py')] : [join(HERE,'worker.mjs')];
  const env=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','TMPDIR','LANG']
    .filter(k=>process.env[k] !== undefined).map(k=>[k,process.env[k]]));
  env.PYTHONDONTWRITEBYTECODE='1';
  const result=spawnSync(executable,args,{input:request,encoding:'utf8',cwd:directory,env,
    timeout:LIMITS.timeoutMs,maxBuffer:LIMITS.maxBuffer,windowsHide:true});
  must(result.status === 0 && !result.error,'offline adapter failed: '+(result.error?.code ?? result.stderr?.slice(-1500) ?? result.signal));
  return {value:JSON.parse(result.stdout),requestBytes:Buffer.byteLength(request),responseBytes:Buffer.byteLength(result.stdout)};
}
export function initialize(directory,config,key) {
  const c=configCheck(config);
  must(Number(process.versions.node.split('.')[0]) >= 22,'Node 22 or later required');
  const sources=sourceManifest(c);
  directory=resolve(directory);
  mkdirSync(directory,{mode:0o700}); // Existing directories are always refused.
  try {
    const preflight=worker(c,directory,'preflight',null).value;
    must(preflight.schema === 'cycle3-preflight/v1' && preflight.authority === 'NONE','preflight');
    durable(join(directory,'config.json'),c);
    durable(join(directory,'sources.json'),{...sources,preflight});
    const sourceHash=hash({config:c,manifest:sources.manifest,preflight});
    createJournal(join(directory,'research.journal'),key,{kind:'header',schema:VERSION,
      session:randomUUID(),sourceHash,authority:'NONE',budget:{...BUDGET}});
    syncDir(directory);
    return inspect(directory,key);
  } catch (error) {
    // Preserve failed setup evidence; never reuse or automatically remove it.
    throw Error('Research setup incomplete; use a new directory. '+error.message);
  }
}
function load(directory,key,expectedHead) {
  directory=resolve(directory);
  const config=configCheck(JSON.parse(regular(join(directory,'config.json'),32768)));
  const sources=JSON.parse(regular(join(directory,'sources.json'),4000000));
  const journal=openJournal(join(directory,'research.journal'),key,{expectedHead});
  const state=replay(journal.records);
  must(hash({config,manifest:sources.manifest,preflight:sources.preflight}) === state.sourceHash
    && hash(sources.manifest) === sources.hash,'session configuration/source binding');
  return {directory,config,sources,journal,state};
}
export function inspect(directory,key,expectedHead) {
  const s=load(directory,key,expectedHead);
  const artifacts=s.state.artifacts;
  let lock=null;
  try {const raw=regular(join(s.directory,'writer.lock'),4096);lock={...JSON.parse(raw),sha256:hash(JSON.parse(raw))};}
  catch(error) {if (error.code !== 'ENOENT') throw error;}
  return {...s.state,head:s.journal.head,lock,
    artifacts:Object.fromEntries(Object.entries(artifacts).map(([k,v])=>[k,hash(v)])),
    journal:{records:s.journal.records.length,bytesOnDisk:statSync(join(s.directory,'research.journal')).size,
      authentication:'HMAC-SHA256; same trusted key holder',externalHeadPin:expectedHead !== undefined},
    draftDatabaseBytes:(()=>{try{return statSync(join(s.directory,'draft.sqlite3')).size;}catch(e){if(e.code==='ENOENT')return 0;throw e;}})(),
    recovery:'Inspection never invokes an adapter. Explicitly abandon unresolved work; begin a new session afterward.'};
}
function exclusive(directory,fn) {
  const path=join(resolve(directory),'writer.lock'),owner={pid:process.pid,token:randomUUID()};
  durable(path,owner);syncDir(resolve(directory));
  let result;
  try {result=fn();} finally {unlinkSync(path);syncDir(resolve(directory));}
  return {...result,lock:null};
}
const event=(kind,fields)=>({schema:VERSION,authority:'NONE',kind,...fields});
function append(s,e) {
  must(s.journal.records.length < LIMITS.records,'record bound');
  replay([...s.journal.records,e]);
  s.journal.append(e);s.state=replay(s.journal.records);
}
export function reserve(directory,key,expectedHead) {
  return exclusive(directory,()=>{
    const s=load(directory,key,expectedHead),state=s.state;
    must(!state.pending && !state.abandoned && state.next < STAGES.length,'session cannot admit work');
    const input=state.next ? state.artifacts[STAGES[state.next-1]] : null;
    append(s,event('reserve',{id:state.operations.length+1,stage:STAGES[state.next],inputHash:hash(input),budget:{...BUDGET}}));
    return inspect(directory,key);
  });
}
export function startReserved(directory,key,expectedHead,checkpoint=()=>{}) {
  return exclusive(directory,()=>{
    const s=load(directory,key,expectedHead),p=s.state.pending;
    must(p && !p.started && !s.state.abandoned,'no unstarted reservation');
    const input=s.state.next ? s.state.artifacts[STAGES[s.state.next-1]] : null;
    // The start is durable before source checks or any adapter computation.
    append(s,event('start',{id:p.id}));
    checkpoint('start'); // Trusted host instrumentation; not exposed through CLI/config/evidence.
    const began=process.hrtime.bigint();
    const before=sourceManifest(s.config);
    must(before.hash === s.sources.hash,'runtime/source drift');
    const response=worker(s.config,s.directory,p.stage,input);
    checkpoint('worker-result');
    const after=sourceManifest(s.config);
    must(after.hash === before.hash,'source changed during operation');
    const {artifact,measured}=response.value;
    must(exact(response.value,['artifact','measured']),'adapter response');
    artifactCheck(p.stage,artifact);vector(measured);
    measured.sourceBytes+=before.bytes+after.bytes;
    measured.ipcBytes=response.requestBytes+response.responseBytes;
    measured.artifactBytes=Buffer.byteLength(JSON.stringify(artifact));
    const diagnostics={elapsedMicros:Number((process.hrtime.bigint()-began)/1000n),
      requestBytes:response.requestBytes,responseBytes:response.responseBytes};
    must(Object.values(diagnostics).every(uint),'invalid diagnostic');
    const byCategory=classify(p.stage,measured,input,artifact);
    append(s,event('result',{id:p.id,artifact,artifactHash:hash(artifact),measured,byCategory,diagnostics}));
    return inspect(directory,key);
  });
}
export function advance(directory,key,expectedHead) {
  // Two durable commands; a crash between them leaves unused reserved work.
  const reserved=reserve(directory,key,expectedHead);
  return startReserved(directory,key,reserved.head);
}
export function abandon(directory,key,reason,expectedHead) {
  return exclusive(directory,()=>{
    const s=load(directory,key,expectedHead);
    if (!s.state.pending) {
      must(s.state.abandoned,'no unresolved work');return inspect(directory,key);
    }
    append(s,event('abandon',{id:s.state.pending.id,reason}));
    return inspect(directory,key);
  });
}
export function unlock(directory,key,expectedLockHash,expectedHead) {
  // Explicit recovery only. Never infer authorization from recovered state.
  const report=inspect(directory,key,expectedHead),lock=report.lock;
  must(lock && lock.sha256 === expectedLockHash,'lock digest mismatch');
  let alive=true;
  try {process.kill(lock.pid,0);} catch(e) {if(e.code==='ESRCH')alive=false;else throw e;}
  must(!alive,'writer process still exists; lock retained');
  unlinkSync(join(resolve(directory),'writer.lock'));syncDir(resolve(directory));
  return inspect(directory,key);
}
export function fullArtifact(directory,key,stage,expectedHead) {
  must(STAGES.includes(stage),'unknown artifact');
  const s=load(directory,key,expectedHead);
  must(s.state.artifacts[stage],'artifact unavailable');
  return s.state.artifacts[stage];
}
