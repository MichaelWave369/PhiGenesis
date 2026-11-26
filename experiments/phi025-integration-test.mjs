import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {test} from './phi025-planner.mjs';
const dir=mkdtempSync(join(tmpdir(),'phi025-')),store=join(dir,'store'),trust=join(dir,'trust.json'),anchor=join(dir,'anchor.json'),wdir=join(dir,'witness');
const roles=['operator','evaluator','witness'],keys=Object.fromEntries(roles.map(r=>[r,generateKeyPairSync('ed25519')])),paths=Object.fromEntries(roles.map(r=>[r,join(dir,r+'.pem')]));
for(const r of roles)writeFileSync(paths[r],keys[r].privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
writeFileSync(trust,JSON.stringify({session:randomUUID(),...Object.fromEntries(roles.map(r=>[r,keys[r].publicKey.export({type:'spki',format:'pem'})]))}));
let checks=0;
function run(file,args,ok=true){
 const r=spawnSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url)),...args],{encoding:'utf8',timeout:12000,maxBuffer:262144});
 if(ok){assert.equal(r.status,0,r.stderr);checks++;return JSON.parse(r.stdout)}
 assert.notEqual(r.status,0);assert.equal(r.signal,null);checks++;
}
const op=(cmd,key,arg,ok=true)=>run('./phi023-cli.mjs',[cmd,store,trust,anchor,...(key?[key]:[]),...(arg!==undefined?[typeof arg==='string'?arg:JSON.stringify(arg)]:[])],ok);
const witness=(cmd='inspect')=>run('./phi024-witness.mjs',[cmd,wdir,trust,...(cmd==='admit'?[paths.witness,store,anchor]:[])]);
const advisory=(world,ok=true)=>run('./phi025-cli.mjs',['plan',store,trust,anchor,wdir,'1',world,'hybrid'],ok);
try{
 const pure=test();op('init',paths.operator);witness('admit');
 const root=readFileSync(anchor),a=advisory('aligned');
 assert.deepEqual(a.proposal.weights,[8,0,8]);assert.equal(a.authority,'NONE');checks+=2;
 assert.deepEqual(witness().state.shadow,[4,4,4]);checks++;
 op('propose',paths.operator,a.proposal);advisory('aligned',false);witness('admit');advisory('aligned',false);
 const r=op('evaluate',paths.evaluator);op('record',paths.operator,r);witness('admit');op('decide',paths.operator,'approve');witness('admit');
 assert.deepEqual(witness().state.shadow,[8,0,8]);checks++;
 const b=advisory('shifted');assert.equal(b.alarm,true);assert.deepEqual(b.proposal.weights,[0,8,0]);checks+=2;
 op('propose',paths.operator,b.proposal);witness('admit');const r2=op('evaluate',paths.evaluator);op('record',paths.operator,r2);witness('admit');
 // Existing governance evaluator remains fixed, so drift proposal fails its evidence gate.
 op('decide',paths.operator,'approve',false);op('decide',paths.operator,'reject');witness('admit');
 const state=witness().state;assert.deepEqual(state.shadow,[8,0,8]);assert.deepEqual(state.production,[4,4,4]);assert.deepEqual(state.closed.map(x=>x.choice),['approve','reject']);assert.equal(state.charged,2916);checks+=4;
 const latest=readFileSync(anchor);writeFileSync(anchor,root);advisory('aligned',false);writeFileSync(anchor,latest);
 assert.equal(witness().sequence,6);checks++;
 console.log(JSON.stringify({status:'passed',checks,pureChecks:pure.checks,advisoryComparisons:a.totalCost+b.totalCost,reservedEvaluationComparisons:state.charged,shadow:state.shadow,production:state.production,driftGateMismatch:true}));
}finally{rmSync(dir,{recursive:true,force:true})}
