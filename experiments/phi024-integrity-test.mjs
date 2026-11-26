import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,renameSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'phi024-')),store=join(dir,'operator-store'),trust=join(dir,'trust.json'),anchor=join(dir,'operator-anchor.json'),wdir=join(dir,'witness');
const roles=['operator','evaluator','witness'],keys=Object.fromEntries(roles.map(r=>[r,generateKeyPairSync('ed25519')])),paths=Object.fromEntries(roles.map(r=>[r,join(dir,r+'.pem')]));
for(const r of roles)writeFileSync(paths[r],keys[r].privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
writeFileSync(trust,JSON.stringify({session:randomUUID(),...Object.fromEntries(roles.map(r=>[r,keys[r].publicKey.export({type:'spki',format:'pem'})]))}));
let checks=0;
function run(file,args,expect='ok'){
 const r=spawnSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url)),...args],{encoding:'utf8',timeout:8000,maxBuffer:262144});
 if(expect==='kill'){assert.equal(r.signal,'SIGKILL',r.stderr);checks++;return}
 if(expect==='fail'){assert.notEqual(r.status,0,'expected failure '+args[0]);assert.equal(r.signal,null);checks++;return}
 assert.equal(r.status,0,r.stderr);checks++;return JSON.parse(r.stdout);
}
const op=(cmd,key,arg,expect='ok')=>run('./phi023-cli.mjs',[cmd,store,trust,anchor,...(key?[key]:[]),...(arg!==undefined?[typeof arg==='string'?arg:JSON.stringify(arg)]:[])],expect);
const witness=(cmd='inspect',key=paths.witness,cut,expect='ok')=>run('./phi024-witness.mjs',[cmd,wdir,trust,...(cmd==='admit'?[key,store,anchor,...(cut?[cut]:[])]:[])],expect);
const admit=()=>witness('admit'),inspect=()=>witness(),proposal=w=>op('propose',paths.operator,{mode:'learn',sources:[],weights:w});
try{
 op('init',paths.operator);const root=readFileSync(anchor);
 assert.equal(admit().sequence,0);checks++;
 assert.equal(admit().duplicate,true);checks++;
 witness('admit',paths.operator,undefined,'fail');
 proposal([8,4,4]);
 const pendingAnchor=readFileSync(anchor);
 witness('admit',paths.witness,'before-link','kill');
 assert.equal(inspect().sequence,0);checks++;
 assert.equal(admit().state.pending.proposal.id,1);checks++;
 const receipt=op('evaluate',paths.evaluator);op('record',paths.operator,receipt);
 witness('admit',paths.witness,'after-durable-link','kill');
 assert.equal(inspect().sequence,2);checks++;
 assert.equal(admit().duplicate,true);checks++;
 op('decide',paths.operator,'approve');assert.deepEqual(admit().state.shadow,[8,4,4]);checks++;
 const latest=readFileSync(anchor);
 writeFileSync(anchor,root);assert.equal(op('inspect').state.attempts,0);checks++;
 witness('admit',paths.witness,undefined,'fail');assert.deepEqual(inspect().state.shadow,[8,4,4]);checks++;
 writeFileSync(anchor,pendingAnchor);witness('admit',paths.witness,undefined,'fail');writeFileSync(anchor,latest);
 // Skipping an unwitnessed proposal and its terminal decision must fail.
 proposal([8,4,8]);const skipped=readFileSync(anchor);op('decide',paths.operator,'abandon');const abandoned=readFileSync(anchor);
 witness('admit',paths.witness,undefined,'fail');writeFileSync(anchor,skipped);admit();writeFileSync(anchor,abandoned);
 const final=admit();assert.equal(final.state.charged,2916);assert.equal(final.state.closed[1].choice,'abandon');assert.deepEqual(final.state.production,[4,4,4]);checks+=3;
 // Detect gaps and modifications within witness history.
 const p=join(wdir,'001.json'),saved=readFileSync(p);writeFileSync(p,saved.toString()+' ');witness('inspect',undefined,undefined,'fail');writeFileSync(p,saved);
 renameSync(p,p+'.hidden');witness('inspect',undefined,undefined,'fail');renameSync(p+'.hidden',p);
 // Explicit trust limit: deleting a complete suffix of the witness log is not detectable locally.
 const tail=join(wdir,'005.json'),tailBytes=readFileSync(tail);unlinkSync(tail);assert.equal(inspect().sequence,4);checks++;writeFileSync(tail,tailBytes);
 assert.equal(inspect().sequence,5);checks++;
 console.log(JSON.stringify({status:'passed',checks,sequence:5,charged:final.state.charged,shadow:final.state.shadow,production:final.state.production,witnessSuffixRollbackLimit:true}));
}finally{rmSync(dir,{recursive:true,force:true})}
