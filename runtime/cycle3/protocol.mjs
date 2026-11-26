// Versioned research protocol. These records never carry operational authority.
import {createHash} from 'node:crypto';

export const VERSION = 'PhiGenesis.CycleIII.v1';
export const STAGES = Object.freeze(['memory', 'retrieve', 'verify', 'plan', 'review', 'replay']);
export const CATEGORIES = Object.freeze(['observation','memory','planning','interpreter','orchestration','evaluation','verification','storage','communication']);
export const UNITS = Object.freeze(['workerCalls', 'fixtureRows', 'comparisons', 'interpreterFuel', 'receiptChecks', 'sqlStatements', 'sourceBytes', 'ipcBytes', 'artifactBytes']);
export const BUDGET = Object.freeze({workerCalls:1, fixtureRows:2592, comparisons:150000, interpreterFuel:99, receiptChecks:99, sqlStatements:3000, sourceBytes:268435456, ipcBytes:1500000, artifactBytes:500000});
export const LIMITS = Object.freeze({records:64, artifactBytes:500000, timeoutMs:15000, maxBuffer:750000});
export const BLOCKERS = Object.freeze([
  'independent-key-custody', 'protected-monotonic-witness', 'complete-runtime-attestation',
  'full-physical-resource-accounting', 'live-enforcement-qualification', 'independent-evaluation',
  'native-memory-and-pocketmesh-integration', 'windows-and-power-loss-qualification',
]);
export const canonical = x => JSON.stringify(x, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v);
export const hash = x => createHash('sha256').update(canonical(x)).digest('hex');
export const must = (ok, message) => {if (!ok) throw Error(message);};
export const exact = (x, keys) => x !== null && typeof x === 'object' && !Array.isArray(x)
  && Object.keys(x).sort().join(',') === [...keys].sort().join(',');
export const uint = x => Number.isSafeInteger(x) && x >= 0;
export const isHash = x => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
export const zero = () => Object.fromEntries(UNITS.map(k => [k,0]));
export const emptyCategories = () => Object.fromEntries(CATEGORIES.map(k=>[k,zero()]));
// Exact classification for the fixed adapters, not a conversion between units.
export function classify(stage,measured,input,artifact) {
  vector(measured);
  const rows=emptyCategories(), primary={memory:'observation',retrieve:'memory',verify:'verification',
    plan:'orchestration',review:'evaluation',replay:'verification'}[stage];
  must(primary,'unknown accounting stage');
  rows[primary]={...measured};
  function move(category,unit,n) {
    must(uint(n) && n <= rows[primary][unit],'classification bounds');
    rows[primary][unit]-=n;rows[category][unit]+=n;
  }
  move('verification','sourceBytes',measured.sourceBytes);
  move('communication','ipcBytes',measured.ipcBytes);
  move('storage','artifactBytes',measured.artifactBytes);
  if (stage === 'memory') {
    must(measured.fixtureRows === artifact.snapshot.next*54,'fixture accounting');
    move('evaluation','fixtureRows',artifact.snapshot.next*36);
    move('evaluation','comparisons',measured.comparisons);
  }
  if (stage === 'retrieve') {
    move('verification','fixtureRows',measured.fixtureRows);
    move('verification','comparisons',input.snapshot.events.reduce((n,e)=>n+e.comparisons,0));
    move('verification','receiptChecks',measured.receiptChecks);
    move('interpreter','interpreterFuel',measured.interpreterFuel);
  }
  return rows;
}
export function artifactCheck(stage, value) {
  const fields = {
    memory:['snapshot'], retrieve:['snapshot','report','packet'], verify:['packet'],
    plan:['packet','draft','runId'], review:['packet','draft','runId','review'],
    replay:['packetDigest','reviewHash','verified','permission','effects'],
  };
  must(STAGES.includes(stage) && exact(value,['schema','authority',...fields[stage]])
    && value.schema === 'cycle3-'+stage+'/v1' && value.authority === 'NONE', 'artifact schema');
  if (value.snapshot) must(value.snapshot.schema === 'phi030-v1' && value.snapshot.authority === 'NONE'
    && value.snapshot.seed === 7 && value.snapshot.regime === 'delayed' && value.snapshot.policy === 'context-tagged'
    && value.snapshot.next === 24 && Array.isArray(value.snapshot.memory) && value.snapshot.memory.length <= 72, 'memory authority');
  if (value.packet) must(value.packet.body?.schema === 'phi032-advisory-v1' && value.packet.body.authority === 'NONE'
    && hash(value.packet.body) === value.packet.digest, 'packet integrity');
  if (value.report) must(value.report.schema === 'phi031-v1' && value.report.authority === 'NONE'
    && value.packet.body.reportHash === hash(value.report), 'report authority');
  if (value.draft) must(value.draft.authority === 'NONE' && value.draft.executionPerformed === false
    && value.draft.packetDigest === value.packet.digest && uint(value.runId) && value.runId > 0, 'draft authority');
  if (value.review) {
    const r=value.review;
    must(r.schema === 'phi033-review-v1' && r.authority === 'NONE' && r.status === 'HELD' && r.zone === 'BOUNDED'
      && r.packetDigest === value.packet.digest && r.projection?.grants?.length === 0 && r.projection?.ceiling?.length === 0
      && r.seal?.trusted_identity === false && r.seal?.action_authority === false && r.seal?.execution_authority === false
      && r.receipts?.length === 4 && r.receipts.every((v,i)=>v.status === (i===3?'HELD':'ACCEPTED')
        && v.action_authority === false && v.execution_authority === false), 'review authority');
  }
  if (stage === 'replay') must(isHash(value.packetDigest) && isHash(value.reviewHash) && value.verified === true
    && exact(value.permission,['allowed','requested','granted','denied']) && value.permission.allowed === false
    && canonical(value.permission.requested) === '["genesis.live.execute"]'
    && canonical(value.permission.denied) === '["genesis.live.execute"]' && canonical(value.permission.granted) === '[]'
    && value.effects.status === 'CLASSIFIED' && value.effects.action_authority === false
    && value.effects.execution_authority === false, 'native deny gate');
  return value;
}
export function vector(v) {
  must(exact(v, UNITS) && UNITS.every(k => uint(v[k])), 'invalid resource vector');
  return v;
}
const plus = (a,b) => Object.fromEntries(UNITS.map(k => [k,a[k]+b[k]]));

export function replay(records) {
  must(Array.isArray(records) && records.length > 0 && records.length <= LIMITS.records, 'record bound');
  const h = records[0];
  must(exact(h,['kind','schema','session','sourceHash','authority','budget']), 'header fields');
  must(h.kind === 'header' && h.schema === VERSION && isHash(h.sourceHash)
    && typeof h.session === 'string' && /^[a-f0-9-]{36}$/.test(h.session)
    && h.authority === 'NONE' && canonical(h.budget) === canonical(BUDGET), 'header');
  const totals = Object.fromEntries(['reserved','measured','uncertain','unused','open'].map(k=>[k,zero()]));
  const artifacts = {}, operations = [];
  const byCategory=emptyCategories();
  let pending = null, next = 0, abandoned = false;
  for (const event of records.slice(1)) {
    must(event && event.schema === VERSION && event.authority === 'NONE', 'event scope');
    if (event.kind === 'reserve') {
      must(exact(event,['schema','authority','kind','id','stage','inputHash','budget']), 'reserve fields');
      must(!pending && !abandoned && next < STAGES.length && event.id === operations.length+1
        && event.stage === STAGES[next] && isHash(event.inputHash)
        && canonical(event.budget) === canonical(BUDGET), 'duplicate or invalid admission');
      const expected = next ? hash(artifacts[STAGES[next-1]]) : hash(null);
      must(event.inputHash === expected, 'operation input binding');
      pending = {id:event.id,stage:event.stage,budget:{...event.budget},started:false};
      totals.reserved = plus(totals.reserved,event.budget);
    } else {
      must(pending && event.id === pending.id, 'no matching reservation');
      if (event.kind === 'start') {
        must(exact(event,['schema','authority','kind','id']) && !pending.started, 'duplicate start');
        pending.started = true;
      } else if (event.kind === 'result') {
        must(exact(event,['schema','authority','kind','id','artifact','artifactHash','measured','byCategory','diagnostics']), 'result fields');
        must(pending.started && event.artifact && event.artifact.authority === 'NONE'
          && Buffer.byteLength(canonical(event.artifact)) <= LIMITS.artifactBytes
          && hash(event.artifact) === event.artifactHash, 'artifact binding');
        artifactCheck(pending.stage,event.artifact);
        const prior=next ? artifacts[STAGES[next-1]] : null;
        if (pending.stage === 'retrieve') must(hash(event.artifact.snapshot) === hash(prior.snapshot), 'snapshot substitution');
        if (['verify','plan','review'].includes(pending.stage)) must(hash(event.artifact.packet) === hash(prior.packet), 'packet substitution');
        if (pending.stage === 'review') must(event.artifact.runId === prior.runId
          && hash(event.artifact.draft) === hash(prior.draft), 'draft substitution');
        if (pending.stage === 'replay') must(event.artifact.packetDigest === prior.packet.digest
          && event.artifact.reviewHash === hash(prior.review), 'replay substitution');
        vector(event.measured);
        must(event.measured.workerCalls === 1 && UNITS.every(k=>event.measured[k] <= pending.budget[k]), 'resource overrun');
        must(exact(event.diagnostics,['elapsedMicros','requestBytes','responseBytes'])
          && Object.values(event.diagnostics).every(uint), 'diagnostics');
        must(canonical(event.byCategory) === canonical(classify(pending.stage,event.measured,prior,event.artifact)), 'accounting category binding');
        for (const category of CATEGORIES) byCategory[category]=plus(byCategory[category],event.byCategory[category]);
        totals.measured = plus(totals.measured,event.measured);
        totals.unused = plus(totals.unused,Object.fromEntries(UNITS.map(k=>[k,pending.budget[k]-event.measured[k]])));
        artifacts[pending.stage] = event.artifact;
        operations.push({...pending,status:'completed',measured:event.measured,byCategory:event.byCategory,diagnostics:event.diagnostics});
        pending = null; next++;
      } else if (event.kind === 'abandon') {
        must(exact(event,['schema','authority','kind','id','reason'])
          && typeof event.reason === 'string' && event.reason.length > 0 && event.reason.length <= 256, 'abandon fields');
        const bucket = pending.started ? 'uncertain' : 'unused';
        totals[bucket] = plus(totals[bucket],pending.budget);
        operations.push({...pending,status:bucket === 'uncertain' ? 'abandoned-uncertain':'abandoned-unused',reason:event.reason});
        pending = null; abandoned = true;
      } else throw Error('unknown event');
    }
  }
  if (pending) totals[pending.started ? 'uncertain':'open'] = plus(totals[pending.started ? 'uncertain':'open'],pending.budget);
  for (const k of UNITS) must(uint(totals.reserved[k]) && totals.reserved[k] ===
    totals.measured[k]+totals.uncertain[k]+totals.unused[k]+totals.open[k], 'resource conservation');
  return {schema:VERSION, session:h.session, sourceHash:h.sourceHash, authority:'NONE',
    release:'BLOCKED', production:[4,4,4], next, pending, abandoned, artifacts, operations, totals, byCategory,
    status:abandoned ? 'INCOMPLETE_ABANDONED' : next === STAGES.length ? 'COMPLETED_RESEARCH_ONLY' : pending ? 'INTERRUPTED' : 'READY',
    blockers:[...BLOCKERS]};
}
