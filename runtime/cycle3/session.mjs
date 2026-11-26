// Single local research writer. The OS account/runtime/config remain trusted.
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,fsyncSync,unlinkSync,lstatSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createJournal,openJournal} from '../journal-disk-v10-rc2.mjs';
import {VERSION,STAGES,BUDGET,LIMITS,hash,must,exact,artifactCheck,vector,uint,classify} from './protocol.mjs';
import {VERSION2,ACTIVITY,ACTIVITY_KINDS,activityBudget,activityZero,activityVector,activityArtifact,classifyActivity,replaySession as replay} from './activities.mjs';
import {makeCheckpoint,verifyContinuity,trustCheck} from './continuity.mjs';
import {seedGenome,transformGenome,qualifyGenome,reconstructParent} from './genome.mjs';
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
  const python=['preflight','plan','review','replay','native-memory'].includes(stage);
  const executable=python ? config.python : process.execPath;
  const args=python ? ['-I','-B',join(HERE,stage==='native-memory'?'native_worker.py':'worker.py')] : [join(HERE,'worker.mjs')];
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
    createJournal(join(directory,'research.journal'),key,{kind:'header',schema:c.schema,
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
  for(const [i,record]of journal.records.entries())if(record.schema===ACTIVITY&&record.kind==='reserve')
    must(record.binding.position===i&&record.binding.head===journal.heads[i-1],'activity prefix position/head mismatch');
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
    must(p && !p.scope && !p.started && !s.state.abandoned,'no unstarted core reservation');
    const input=s.state.next ? s.state.artifacts[STAGES[s.state.next-1]] : null;
    // The start is durable before source checks or any adapter computation.
    append(s,event('start',{id:p.id}));
    checkpoint('start'); // Trusted host instrumentation; not exposed through CLI/config/evidence.
    const began=process.hrtime.bigint();
    const inventory=s.config.schema===VERSION2?s.sources.manifest:undefined;
    const before=sourceManifest(s.config,inventory);
    must(before.hash === s.sources.hash,'runtime/source drift');
    const response=worker(s.config,s.directory,p.stage,input);
    checkpoint('worker-result');
    const after=sourceManifest(s.config,inventory);
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
    append(s,s.state.pending.scope==='activity'
      ?{schema:ACTIVITY,authority:'NONE',kind:'abandon',id:s.state.pending.id,reason}
      :event('abandon',{id:s.state.pending.id,reason}));
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
  must([...STAGES,...ACTIVITY_KINDS].includes(stage),'unknown artifact');
  const s=load(directory,key,expectedHead);
  must(s.state.artifacts[stage],'artifact unavailable');
  return s.state.artifacts[stage];
}

function snapshotView(s,position=s.journal.records.length){
  must(uint(position)&&position>0&&position<=s.journal.records.length,'checkpoint position');
  const state=replay(s.journal.records.slice(0,position));
  must(!state.pending&&!state.abandoned,'checkpoint requires a settled prefix');
  return {session:state.session,protocol:state.schema,position,head:s.journal.heads[position-1],
    sourceHash:state.sourceHash,runtimeManifestHash:s.sources.hash,configurationDigest:hash(s.config),
    artifacts:Object.fromEntries(Object.entries(state.artifacts).map(([k,v])=>[k,hash(v)]))};
}
export function checkpointView(directory,key,position){return snapshotView(load(directory,key),position);}
export function reserveActivity(directory,key,kind,request,expectedHead){
  return exclusive(directory,()=>{
    const s=load(directory,key,expectedHead);
    must(s.config.schema===VERSION2&&ACTIVITY_KINDS.includes(kind)&&s.state.next===STAGES.length
      &&!s.state.pending&&!s.state.abandoned,'explicit v2 completed core required');
    if(kind==='checkpoint'){
      must(exact(request,['policy','previous']),'checkpoint request fields');trustCheck(request.policy);
      must(request.previous===(s.state.artifacts.checkpoint?.content.checkpoint.digest??null),'previous checkpoint mismatch');
    }
    if(kind==='genome')must(exact(request,['parent','operation','ancestors'])&&s.state.artifacts['native-memory'],'genome needs native reference catalog');
    append(s,{schema:ACTIVITY,authority:'NONE',kind:'reserve',id:s.state.activities.length+1,activity:kind,
      request,requestDigest:hash(request),binding:{position:s.journal.records.length,head:s.journal.head},budget:activityBudget(kind)});
    return inspect(directory,key);
  });
}
async function exclusiveAsync(directory,fn){
  const path=join(resolve(directory),'writer.lock');
  durable(path,{pid:process.pid,token:randomUUID()});syncDir(resolve(directory));
  let result;try{result=await fn();}finally{unlinkSync(path);syncDir(resolve(directory));}
  return {...result,lock:null};
}
async function witnessCall(call,timeoutMs){
  must(uint(timeoutMs)&&timeoutMs>0&&timeoutMs<=LIMITS.timeoutMs,'bounded witness timeout');
  const controller=new AbortController();let timer;
  try{return await Promise.race([Promise.resolve().then(()=>call(controller.signal)),new Promise((_,reject)=>{
    timer=setTimeout(()=>{controller.abort();reject(Error('witness timeout; expenditure and remote completion uncertain'));},timeoutMs);
  })]);}finally{clearTimeout(timer);}
}
export async function startActivity(directory,key,expectedHead,{transport,checkpointHook=()=>{},timeoutMs=LIMITS.timeoutMs}={}){
  return exclusiveAsync(directory,async()=>{
    const s=load(directory,key,expectedHead),p=s.state.pending;
    must(s.config.schema===VERSION2&&p?.scope==='activity'&&!p.started&&!s.state.abandoned,'unstarted v2 activity required');
    append(s,{schema:ACTIVITY,authority:'NONE',kind:'start',id:p.id});checkpointHook('start');
    const began=process.hrtime.bigint(),before=sourceManifest(s.config,s.sources.manifest);
    must(before.hash===s.sources.hash,'runtime/source drift');
    let content,measured=activityZero(),requestBytes=0,responseBytes=0;
    if(p.stage==='native-memory'){
      const response=worker(s.config,s.directory,'native-memory',p.request);
      content=response.value.artifact;Object.assign(measured,response.value.measured);
      requestBytes=response.requestBytes;responseBytes=response.responseBytes;
    }else if(p.stage==='genome'){
      const native=s.state.artifacts['native-memory'].content;
      const frame={actorId:s.state.session,implementationHash:s.sources.hash,controlDigest:s.state.sourceHash};
      const expected=s.state.artifacts.genome?.content.candidate??seedGenome(frame,native.references);
      must(hash(expected)===hash(p.request.parent),'genome parent is not current configuration');
      const known=new Set();
      for(const record of s.journal.records)if(record.schema===ACTIVITY&&record.kind==='reserve'&&record.activity==='genome')known.add(hash(record.request.parent));
      for(const record of s.journal.records)if(record.schema===ACTIVITY&&record.kind==='result'&&record.artifact.kind==='genome')known.add(hash(record.artifact.content.candidate));
      must(Array.isArray(p.request.ancestors)&&p.request.ancestors.every(a=>known.has(hash(a))),'unrecorded genome ancestor');
      const catalog=new Map(native.references.map(r=>[r.nativeId,r.recordDigest]));
      const result=transformGenome(p.request.parent,p.request.operation,p.request.ancestors,frame,catalog);
      must(hash(reconstructParent(result.candidate,result.receipt,frame,catalog))===hash(p.request.parent),'exact genome reconstruction');
      const mapping=await qualifyGenome(result,s.config.roots);
      content={candidate:result.candidate,receipt:result.receipt,mapping};measured.graphVisits=result.visits+result.candidate.pockets.length;
    }else{
      must(transport&&typeof transport.commit==='function'&&typeof transport.attest==='function','witness unavailable; explicit transport required');
      const view=snapshotView(s,p.binding.position);
      const previous=s.state.artifacts.checkpoint?.content.checkpoint??null;
      const checkpoint=makeCheckpoint(view,previous,p.request.policy);
      await witnessCall(signal=>transport.commit(checkpoint,s.journal.heads.slice(0,view.position),{signal}),timeoutMs);checkpointHook('witness-committed');
      const nonce=randomBytes(16).toString('hex'),proof=await witnessCall(signal=>transport.attest(nonce,{signal}),timeoutMs);
      const proofs=Array.isArray(proof)?proof:[proof];
      const verification=await verifyContinuity({root:s.config.roots.NBGPocketMesh,checkpoint,view,
        heads:s.journal.heads,policy:p.request.policy,proofs,nonce});
      content={checkpoint,proofs,verification};measured.checkpointRecords=1;measured.witnessChecks=proofs.length;
    }
    checkpointHook('worker-result');
    const after=sourceManifest(s.config,s.sources.manifest);must(after.hash===before.hash,'source changed during activity');
    const artifact={schema:ACTIVITY,authority:'NONE',kind:p.stage,requestDigest:hash(p.request),content};
    activityArtifact(artifact,p.stage,p.request);
    measured.sourceBytes+=before.bytes+after.bytes;measured.ipcBytes=requestBytes+responseBytes;
    measured.artifactBytes=Buffer.byteLength(JSON.stringify(artifact));activityVector(measured);
    const diagnostics={elapsedMicros:Number((process.hrtime.bigint()-began)/1000n),requestBytes,responseBytes};
    append(s,{schema:ACTIVITY,authority:'NONE',kind:'result',id:p.id,artifact,artifactHash:hash(artifact),measured,
      byCategory:classifyActivity(p.stage,measured),diagnostics});return inspect(directory,key);
  });
}
export async function performActivity(directory,key,kind,request,options={}){
  const reserved=reserveActivity(directory,key,kind,request,options.expectedHead);
  return startActivity(directory,key,reserved.head,options);
}
export async function protectedRead(directory,key,{checkpoint,policy,transport,expectedHead,timeoutMs=LIMITS.timeoutMs}){
  const s=load(directory,key,expectedHead);
  checkpoint??=s.state.artifacts.checkpoint?.content.checkpoint;
  must(checkpoint&&transport&&typeof transport.attest==='function','protected read requires checkpoint and fresh witness transport');
  const view=snapshotView(s,checkpoint.body.view.position),nonce=randomBytes(16).toString('hex');
  const proof=await witnessCall(signal=>transport.attest(nonce,{signal}),timeoutMs),proofs=Array.isArray(proof)?proof:[proof];
  return verifyContinuity({root:s.config.roots.NBGPocketMesh,checkpoint,view,heads:s.journal.heads,policy,proofs,nonce});
}
