// Finite non-executable development data. This is never a policy or permit.
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {exact,must,isHash,hash,canonical} from './protocol.mjs';
export const GENOME='PhiGenesis.RelationalGenome.v1';
export const CEILINGS=Object.freeze({pockets:36,relations:72,depth:6,memoryRefsPerPocket:9});
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9_]{0,31}$/.test(x);
export function validateGenome(g,frame,catalog){
  must(exact(g,['schema','actorId','implementationHash','controlDigest','resourceCeilings','pockets','relations',
    'ancestralConfigurations','evaluationRefs','evidenceRequirements','authority','executionAuthority'])
    &&g.schema===GENOME&&g.actorId===frame.actorId&&g.implementationHash===frame.implementationHash
    &&g.controlDigest===frame.controlDigest&&g.authority==='NONE'&&g.executionAuthority===false
    &&canonical(g.resourceCeilings)===canonical(CEILINGS),'genome identity/control/ceiling');
  must(Array.isArray(g.pockets)&&g.pockets.length>0&&g.pockets.length<=CEILINGS.pockets
    &&Array.isArray(g.relations)&&g.relations.length<=CEILINGS.relations,'finite topology bound');
  const nodes=new Map();
  for(const p of g.pockets){
    must(exact(p,['id','parent','memoryRefs'])&&id(p.id)&&!nodes.has(p.id)
      &&(p.parent===null||id(p.parent))&&Array.isArray(p.memoryRefs)&&p.memoryRefs.length<=CEILINGS.memoryRefsPerPocket,'pocket schema');
    const seen=new Set();
    for(const r of p.memoryRefs){
      must(exact(r,['nativeId','recordDigest'])&&typeof r.nativeId==='string'&&isHash(r.recordDigest)
        &&catalog.get(r.nativeId)===r.recordDigest&&!seen.has(r.nativeId),'native memory reference substitution');seen.add(r.nativeId);
    }
    nodes.set(p.id,p);
  }
  must(nodes.get('root')?.parent===null&&g.pockets.filter(p=>p.parent===null).length===1,'one stable root required');
  const paths={};let visits=0;
  for(const p of g.pockets){
    const seen=new Set(),parts=[];let cursor=p.id;
    while(cursor!==null){must(nodes.has(cursor)&&!seen.has(cursor),'orphan or nested cycle');seen.add(cursor);parts.unshift(cursor);
      must(parts.length<=CEILINGS.depth,'nesting depth');cursor=nodes.get(cursor).parent;visits++;}
    must(parts[0]==='root','orphaned root');paths[p.id]=parts.join('/');
  }
  const edgeIds=new Set(),pairs=new Map(),adj=new Map([...nodes.keys()].map(k=>[k,[]]));
  for(const e of g.relations){
    must(exact(e,['id','from','to','type'])&&id(e.id)&&!edgeIds.has(e.id)&&nodes.has(e.from)&&nodes.has(e.to)
      &&e.from!==e.to&&['supports','challenges','depends'].includes(e.type),'typed relation');edgeIds.add(e.id);
    const key=e.from+'>'+e.to,types=pairs.get(key)??new Set();
    must(!types.has(e.type)&&!(types.has('supports')&&e.type==='challenges')&&!(types.has('challenges')&&e.type==='supports'),'contradictory or duplicate relationship');
    types.add(e.type);pairs.set(key,types);adj.get(e.from).push(e.to);visits++;
  }
  const active=new Set(),done=new Set();
  function check(n){must(!active.has(n),'unauthorized relation cycle');if(done.has(n))return;active.add(n);visits++;
    for(const next of adj.get(n))check(next);active.delete(n);done.add(n);}
  for(const n of nodes.keys())check(n);
  for(const list of [g.ancestralConfigurations,g.evaluationRefs])must(Array.isArray(list)&&list.length<=9&&new Set(list).size===list.length&&list.every(isHash),'bounded evidence/ancestry refs');
  must(Array.isArray(g.evidenceRequirements)&&g.evidenceRequirements.length<=9&&new Set(g.evidenceRequirements).size===g.evidenceRequirements.length
    &&g.evidenceRequirements.every(x=>typeof x==='string'&&/^[a-z][a-z0-9_.-]{0,63}$/.test(x)),'evidence requirements');
  return {paths,visits};
}
export function seedGenome(frame,references){
  return {schema:GENOME,...frame,resourceCeilings:{...CEILINGS},pockets:[
    {id:'root',parent:null,memoryRefs:references.slice(0,9).map(r=>({nativeId:r.nativeId,recordDigest:r.recordDigest}))},
    {id:'a',parent:'root',memoryRefs:[]},{id:'b',parent:'root',memoryRefs:[]}],
    relations:[{id:'ab',from:'a',to:'b',type:'depends'}],ancestralConfigurations:[],evaluationRefs:[],
    evidenceRequirements:['native-record-digest','operator-review'],authority:'NONE',executionAuthority:false};
}
export function transformGenome(parent,operation,ancestors,frame,catalog){
  const before=validateGenome(parent,frame,catalog);
  must(Array.isArray(ancestors)&&ancestors.length<=9,'ancestor budget');
  const registry=new Map();let visits=before.visits;
  for(const ancestor of ancestors){const r=validateGenome(ancestor,frame,catalog);visits+=r.visits;registry.set(hash(ancestor),ancestor);}
  const candidate=structuredClone(parent);must(operation&&typeof operation==='object','typed transformation required');
  if(operation.op==='NEST'){
    must(exact(operation,['op','pocket','parent'])&&operation.pocket!=='root','NEST fields/root');
    const p=candidate.pockets.find(p=>p.id===operation.pocket);must(p&&candidate.pockets.some(p=>p.id===operation.parent),'NEST references');p.parent=operation.parent;
  }else if(operation.op==='REVERSE'){
    must(exact(operation,['op','relation']),'REVERSE fields');const e=candidate.relations.find(e=>e.id===operation.relation);must(e,'unknown relation');[e.from,e.to]=[e.to,e.from];
  }else if(operation.op==='RECALL'){
    must(exact(operation,['op','ancestorDigest'])&&registry.has(operation.ancestorDigest)&&parent.ancestralConfigurations.includes(operation.ancestorDigest),'known ancestor required');
    const source=registry.get(operation.ancestorDigest);candidate.pockets=structuredClone(source.pockets);candidate.relations=structuredClone(source.relations);
  }else if(operation.op==='COMPOSE'){
    must(exact(operation,['op','pocket','ancestorDigest'])&&registry.has(operation.ancestorDigest)&&parent.ancestralConfigurations.includes(operation.ancestorDigest),'COMPOSE ancestor');
    const target=candidate.pockets.find(p=>p.id===operation.pocket),source=registry.get(operation.ancestorDigest).pockets.find(p=>p.id===operation.pocket);
    must(target&&source,'same-identity pocket required');const refs=new Map([...target.memoryRefs,...source.memoryRefs].map(r=>[r.nativeId,r]));
    target.memoryRefs=[...refs.values()].sort((a,b)=>a.nativeId.localeCompare(b.nativeId));
  }else throw Error('unsupported transformation semantics: '+operation.op);
  candidate.ancestralConfigurations=[...new Set([hash(parent),...parent.ancestralConfigurations])].slice(0,9);
  const after=validateGenome(candidate,frame,catalog);visits+=after.visits;
  const receipt={schema:'PhiGenesis.GenomeTransformation.v1',authority:'NONE',executionAuthority:false,
    parentDigest:hash(parent),candidateDigest:hash(candidate),operation:structuredClone(operation),
    ancestorDigests:[...registry.keys()].sort(),resourceCeilingsDigest:hash(CEILINGS),controlDigest:frame.controlDigest,
    undo:{pockets:structuredClone(parent.pockets),relations:structuredClone(parent.relations),ancestralConfigurations:parent.ancestralConfigurations.slice()}};
  return {candidate,receipt,paths:after.paths,visits};
}
export function reconstructParent(candidate,receipt,frame,catalog){
  validateGenome(candidate,frame,catalog);
  must(receipt?.schema==='PhiGenesis.GenomeTransformation.v1'&&receipt.authority==='NONE'&&receipt.executionAuthority===false
    &&hash(candidate)===receipt.candidateDigest&&receipt.controlDigest===frame.controlDigest
    &&receipt.resourceCeilingsDigest===hash(CEILINGS)&&exact(receipt.undo,['pockets','relations','ancestralConfigurations']),'transformation receipt binding');
  const restored={...structuredClone(candidate),...structuredClone(receipt.undo)};
  validateGenome(restored,frame,catalog);must(hash(restored)===receipt.parentDigest,'reconstruction mismatch');return restored;
}
export async function qualifyGenome(result,roots){
  const alt=await import(pathToFileURL(join(roots.Altermath,'src/causal-belt.mjs')).href);
  const mesh=await import(pathToFileURL(join(roots.NBGPocketMesh,'src/phi-mycelium-r2.mjs')).href);
  must(alt.CAUSAL_VERSION==='Altermath.CausalBelt.R1'&&mesh.VERSION==='mandelbrot-pocket-v1','native genome mapping versions');
  const pockets=Object.fromEntries(Object.values(result.paths).map(path=>[path,{fields:{pocket_count:result.candidate.pockets.length}}]));
  const compiled=alt.compileCausalScore({pockets,score:[{id:'count',op:'OBSERVE',pocket:'root',deps:[],field:'pocket_count'},
    {id:'finish',op:'FINISH',pocket:'root',deps:['count'],source:'count'}]});
  return {schema:'PhiGenesis.GenomeNativeMapping.v1',authority:'NONE',executionAuthority:false,
    altermathVersion:alt.CAUSAL_VERSION,compiledEvents:compiled.order.length,pocketPaths:result.paths,
    myceliumVersion:mesh.VERSION,ordinalAddresses:['root',...result.candidate.pockets.map(p=>p.id).filter(id=>id!=='root').sort()].map((id,i)=>({id,address:mesh.pocketAddress(i)})),
    scope:'Native syntax/address mapping only; no score execution or Mycelium routing.'};
}
