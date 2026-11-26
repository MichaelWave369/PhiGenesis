import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'phi023-')),store=join(dir,'snapshots'),trust=join(dir,'trust.json'),anchor=join(dir,'operator-anchor.json');
const keys=Object.fromEntries(['operator','evaluator'].map(r=>[r,generateKeyPairSync('ed25519')]));
const op=join(dir,'operator.pem'),ev=join(dir,'evaluator.pem');
for(const [role,path] of [['operator',op],['evaluator',ev]])writeFileSync(path,keys[role].privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
writeFileSync(trust,JSON.stringify({session:randomUUID(),operator:keys.operator.publicKey.export({type:'spki',format:'pem'}),evaluator:keys.evaluator.publicKey.export({type:'spki',format:'pem'})}));
let checks=0;
function run(cmd,key,arg,ok=true){
 const a=[fileURLToPath(new URL('./phi023-cli.mjs',import.meta.url)),cmd,store,trust,anchor];if(key!==undefined)a.push(key);if(arg!==undefined)a.push(typeof arg==='string'?arg:JSON.stringify(arg));
 const r=spawnSync(process.execPath,a,{encoding:'utf8',timeout:8000,maxBuffer:262144});
 if(ok){assert.equal(r.status,0,r.stderr);checks++;return JSON.parse(r.stdout)}
 assert.notEqual(r.status,0,'expected refusal '+cmd);checks++;
}
const inspect=()=>run('inspect').state,propose=(weights,mode='learn',sources=[])=>run('propose',op,{weights,mode,sources}).state;
try{
 const root=run('init',op),oldAnchor=readFileSync(anchor);
 run('init',op,undefined,false);
 assert.deepEqual(inspect().shadow,[4,4,4]);checks++;
 run('propose',ev,{mode:'learn',weights:[8,4,4],sources:[]},false);
 assert.equal(propose([8,4,4]).charged,1458);checks++;
 assert.equal(inspect().pending.proposal.id,1);checks++;
 run('decide',op,'approve',false);run('evaluate',op,undefined,false);
 const r=run('evaluate',ev);assert.deepEqual(r.metrics.candidate,[9,9,7]);checks++;
 run('record',op,{...r,metrics:{...r.metrics,cost:1}},false);
 run('record',op,r);run('record',op,r,false);run('decide',ev,'approve',false);
 assert.deepEqual(run('decide',op,'approve').state.shadow,[8,4,4]);checks++;
 assert.deepEqual(inspect().shadow,[8,4,4]);checks++;
 propose([8,4,8],'learn');const r2=run('evaluate',ev);run('record',op,r,false);run('record',op,r2);
 assert.deepEqual(run('decide',op,'approve').state.shadow,[8,4,8]);checks++;
 propose([8,4,4],'recall',[1]);const r3=run('evaluate',ev);run('record',op,r3);run('decide',op,'approve',false);run('decide',op,'reject');
 propose([4,4,8],'compose',[0,0,2]);assert.equal(inspect().pending.proposal.id,4);checks++;
 // Cold restart with reserved but unresolved work: explicitly abandon; no evaluator invocation.
 run('decide',op,'abandon');run('decide',op,'abandon',false);run('evaluate',ev,undefined,false);
 const s=inspect();assert.equal(s.charged,4*1458);assert.equal(s.attempts,4);assert.equal(s.pending,null);assert.deepEqual(s.production,[4,4,4]);assert.deepEqual(s.closed.map(x=>x.choice),['approve','approve','reject','abandon']);checks+=5;
 // Unreferenced snapshot cannot override the signed head; altered pinned content fails closed.
 writeFileSync(join(store,'unreferenced.json'),'{}');assert.deepEqual(inspect().shadow,[8,4,8]);checks++;
 const current=run('inspect'),pinned=join(store,current.head+'.json'),bytes=readFileSync(pinned);
 writeFileSync(pinned,bytes.toString()+' ');run('inspect',undefined,undefined,false);writeFileSync(pinned,bytes);
 const latest=readFileSync(anchor);const altered=JSON.parse(latest);altered.body.head=root.head;writeFileSync(anchor,JSON.stringify(altered));run('inspect',undefined,undefined,false);
 writeFileSync(anchor,latest);assert.equal(run('inspect').head,current.head);checks++;
 // Known limit: replacing the entire anchor with a valid older signed anchor rolls back.
 writeFileSync(anchor,oldAnchor);assert.equal(run('inspect').state.attempts,0);checks++;writeFileSync(anchor,latest);
 console.log(JSON.stringify({status:'passed',checks,attempts:s.attempts,charged:s.charged,shadow:s.shadow,production:s.production,rollbackLimitDemonstrated:true}));
}finally{rmSync(dir,{recursive:true,force:true})}
