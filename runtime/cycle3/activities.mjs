// Explicit v2 extension of the SAME session journal. No v1 bytes are rewritten.
// A v2 header declares an embedded v1 core followed by bounded activity records.
import {VERSION,STAGES,UNITS,CATEGORIES,BUDGET,canonical,hash,must,exact,isHash,uint,replay as coreReplay} from './protocol.mjs';
import {checkpointCheck} from './continuity.mjs';
import {GENOME} from './genome.mjs';
export const VERSION2='PhiGenesis.CycleIII.v2';
export const ACTIVITY='PhiGenesis.CycleIII.Activity.v1';
export const ACTIVITY_KINDS=Object.freeze(['checkpoint','native-memory','genome']);
export const ACTIVITY_UNITS=Object.freeze([...UNITS,'nativeRecords','provenanceEdges','checkpointRecords','witnessChecks','graphVisits']);
export const ACTIVITY_BUDGET=Object.freeze({...BUDGET,fixtureRows:0,comparisons:0,interpreterFuel:0,
  nativeRecords:1024,provenanceEdges:4096,checkpointRecords:1,witnessChecks:3,graphVisits:8192});
export const activityBudget=kind=>kind==='checkpoint'
  ?{...ACTIVITY_BUDGET,workerCalls:0,sqlStatements:0,nativeRecords:0,provenanceEdges:0,graphVisits:0}
  :kind==='genome'?{...ACTIVITY_BUDGET,workerCalls:0,sqlStatements:0,nativeRecords:0,provenanceEdges:0,checkpointRecords:0,witnessChecks:0}
  :{...ACTIVITY_BUDGET,checkpointRecords:0,witnessChecks:0,graphVisits:0};
export const activityZero=()=>Object.fromEntries(ACTIVITY_UNITS.map(k=>[k,0]));
const groups=()=>Object.fromEntries(CATEGORIES.map(k=>[k,activityZero()]));
const plus=(a,b)=>Object.fromEntries(ACTIVITY_UNITS.map(k=>[k,a[k]+b[k]]));
export function activityVector(v){must(exact(v,ACTIVITY_UNITS)&&ACTIVITY_UNITS.every(k=>uint(v[k])),'activity resource vector');return v;}
export function activityArtifact(value,kind,request){
  must(exact(value,['schema','authority','kind','requestDigest','content'])&&value.schema===ACTIVITY
    &&value.authority==='NONE'&&value.kind===kind&&value.requestDigest===hash(request),'activity artifact');
  if(kind==='native-memory'){
    const a=value.content;
    must(a?.schema==='PhiGenesis.NativeMemoryIntake.v1'&&a.authority==='NONE'&&a.actionAuthority===false
      &&a.executionAuthority===false&&a.databaseDigest===request.databaseSha256&&a.requestDigest===hash(request)
      &&Array.isArray(a.references)&&a.references.length<=72
      &&a.references.every(r=>r.authority==='NONE'&&typeof r.nativeId==='string'&&isHash(r.recordDigest)
        &&isHash(r.contentDigest)&&typeof r.eligible==='boolean'&&Array.isArray(r.holds)),'native memory scope');
  }else if(kind==='checkpoint'){
    must(exact(value.content,['checkpoint','proofs','verification']),'checkpoint activity fields');
    const cp=checkpointCheck(value.content.checkpoint),r=value.content.verification;
    must(cp.body.witness.policyDigest===hash(request.policy)&&cp.body.previous===request.previous
      &&r.schema==='PhiGenesis.ProtectedContinuityRead.v1'&&r.authority==='NONE'&&r.executionAuthority===false
      &&r.release==='BLOCKED'&&r.checkpointDigest===cp.digest&&Array.isArray(value.content.proofs)
      &&value.content.proofs.length>0&&value.content.proofs.length<=3,'checkpoint verification scope');
  }else if(kind==='genome'){
    const a=value.content;
    must(exact(a,['candidate','receipt','mapping'])&&a.candidate.schema===GENOME&&a.candidate.authority==='NONE'
      &&a.candidate.executionAuthority===false&&a.receipt.authority==='NONE'&&a.receipt.executionAuthority===false
      &&a.receipt.parentDigest===hash(request.parent)&&a.receipt.candidateDigest===hash(a.candidate)
      &&hash(a.receipt.operation)===hash(request.operation)&&a.mapping.authority==='NONE'&&a.mapping.executionAuthority===false,'genome activity binding');
  }else throw Error('unsupported activity');
  return value;
}
export function classifyActivity(kind,measured){
  activityVector(measured);const result=groups(),primary=kind==='native-memory'?'memory':kind==='genome'?'planning':'verification';
  result[primary]={...measured};
  for(const [unit,target]of [['sourceBytes','verification'],['ipcBytes','communication'],['artifactBytes','storage'],['provenanceEdges','verification'],['checkpointRecords','storage']]){
    result[primary][unit]-=measured[unit];result[target][unit]+=measured[unit];
  }
  return result;
}
export function replaySession(records){
  if(records[0]?.schema===VERSION)return coreReplay(records);
  must(records[0]?.schema===VERSION2&&records.length<=64,'unknown session protocol or record bound');
  const first=records.findIndex((e,i)=>i>0&&e?.schema===ACTIVITY),cut=first<0?records.length:first;
  // Declared, read-only compatibility projection. Signatures/HMAC are verified
  // on ORIGINAL records by the shared disk reader before this semantic replay.
  const core=coreReplay([{...records[0],schema:VERSION},...records.slice(1,cut)]);
  const artifacts={...core.artifacts},activities=[],totals=Object.fromEntries(['reserved','measured','uncertain','unused','open'].map(k=>[k,activityZero()])),byCategory=groups();
  let pending=null,abandoned=false;
  if(cut<records.length)must(core.next===STAGES.length&&!core.pending&&!core.abandoned,'core must complete before extension activities');
  for(const e of records.slice(cut)){
    must(e?.schema===ACTIVITY&&e.authority==='NONE','activity record scope');
    if(e.kind==='reserve'){
      must(exact(e,['schema','authority','kind','id','activity','request','requestDigest','binding','budget'])
        &&ACTIVITY_KINDS.includes(e.activity)&&!pending&&!abandoned&&activities.length<9
        &&e.id===activities.length+1&&e.requestDigest===hash(e.request)
        &&e.request&&typeof e.request==='object'&&!Array.isArray(e.request)&&Buffer.byteLength(canonical(e.request))<=65536
        &&exact(e.binding,['position','head'])&&uint(e.binding.position)&&e.binding.position>0&&isHash(e.binding.head)
        &&canonical(e.budget)===canonical(activityBudget(e.activity)),'activity admission');
      pending={id:e.id,stage:e.activity,scope:'activity',request:e.request,binding:e.binding,budget:{...e.budget},started:false};
      totals.reserved=plus(totals.reserved,e.budget);
    }else{
      must(pending&&e.id===pending.id,'no activity reservation');
      if(e.kind==='start'){
        must(exact(e,['schema','authority','kind','id'])&&!pending.started,'duplicate activity start');pending.started=true;
      }else if(e.kind==='result'){
        must(exact(e,['schema','authority','kind','id','artifact','artifactHash','measured','byCategory','diagnostics'])
          &&pending.started&&e.artifactHash===hash(e.artifact)&&Buffer.byteLength(canonical(e.artifact))<=500000,'activity result binding');
        activityArtifact(e.artifact,pending.stage,pending.request);activityVector(e.measured);
        must(ACTIVITY_UNITS.every(k=>e.measured[k]<=pending.budget[k])
          &&canonical(e.byCategory)===canonical(classifyActivity(pending.stage,e.measured))
          &&exact(e.diagnostics,['elapsedMicros','requestBytes','responseBytes'])&&Object.values(e.diagnostics).every(uint),'activity accounting');
        if(pending.stage==='checkpoint'){
          const cp=e.artifact.content.checkpoint;
          must(cp.body.view.session===core.session&&cp.body.view.protocol===VERSION2&&cp.body.view.sourceHash===core.sourceHash
            &&cp.body.view.position===pending.binding.position&&cp.body.view.head===pending.binding.head
            &&cp.body.previous===(artifacts.checkpoint?.content.checkpoint.digest??null)
            &&canonical(cp.body.view.artifacts)===canonical(Object.fromEntries(Object.entries(artifacts).map(([k,v])=>[k,hash(v)]))),'checkpoint prefix/artifact inventory binding');
        }
        totals.measured=plus(totals.measured,e.measured);
        totals.unused=plus(totals.unused,Object.fromEntries(ACTIVITY_UNITS.map(k=>[k,pending.budget[k]-e.measured[k]])));
        for(const c of CATEGORIES)byCategory[c]=plus(byCategory[c],e.byCategory[c]);
        activities.push({...pending,status:'completed',artifactHash:e.artifactHash,measured:e.measured,byCategory:e.byCategory,diagnostics:e.diagnostics});
        artifacts[pending.stage]=e.artifact;pending=null;
      }else if(e.kind==='abandon'){
        must(exact(e,['schema','authority','kind','id','reason'])&&typeof e.reason==='string'&&e.reason.length>0&&e.reason.length<=256,'activity abandon');
        const bucket=pending.started?'uncertain':'unused';totals[bucket]=plus(totals[bucket],pending.budget);
        activities.push({...pending,status:'abandoned-'+bucket,reason:e.reason});pending=null;abandoned=true;
      }else throw Error('unknown activity event');
    }
  }
  if(pending)totals[pending.started?'uncertain':'open']=plus(totals[pending.started?'uncertain':'open'],pending.budget);
  for(const k of ACTIVITY_UNITS)must(uint(totals.reserved[k])&&totals.reserved[k]===totals.measured[k]+totals.uncertain[k]+totals.unused[k]+totals.open[k],'activity conservation');
  return {...core,schema:VERSION2,artifacts,activities,activityTotals:totals,activityByCategory:byCategory,
    pending:pending??core.pending,abandoned:abandoned||core.abandoned,
    status:abandoned?'INCOMPLETE_ABANDONED':pending?'INTERRUPTED':core.status};
}
