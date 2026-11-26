import {generateKeyPairSync,randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,renameSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {openJournal,hash} from './phi028-journal.mjs';
import {environment,journalHeads,openWitness,readQuorum} from './phi029-witness.mjs';
const roles=['context','operator','evaluator','planner','w0','w1','w2'],ids=roles.slice(4);
function host(root){
 const config=JSON.parse(readFileSync(join(root,'trust.json'))),dir=join(root,'journal'),journal=openJournal(dir,config),env=environment(config,journal),key=r=>join(root,r+'.pem'),w=id=>openWitness(join(root,id),id,env);
 return {config,dir,journal,env,key,w};
}
if(process.argv[2]==='worker'){
 const h=host(process.argv[3]),id=process.argv[4],command=process.argv[5],arg=process.argv[6],signer=h.env.signer(id,h.key(id));
 const result=command==='sync'?h.w(id).sync(journalHeads(h.journal,h.dir).heads,signer,arg):h.w(id).attest(arg,signer);
 console.log(JSON.stringify(result));
}else{
 const root=mkdtempSync(join(tmpdir(),'phi029-'));for(const d of ['journal',...ids])mkdirSync(join(root,d));
 const keys=Object.fromEntries(roles.map(r=>[r,generateKeyPairSync('ed25519')])),config={session:randomUUID(),...Object.fromEntries(roles.map(r=>[r,keys[r].publicKey.export({type:'spki',format:'pem'})]))};
 for(const r of roles)writeFileSync(join(root,r+'.pem'),keys[r].privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 writeFileSync(join(root,'trust.json'),JSON.stringify(config));const h=host(root);let checks=0;
 const op=h.journal.signer('operator',h.key('operator')),contextSign=h.journal.signer('context',h.key('context'));
 function child(id,cmd,arg,expect='ok'){
  const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'worker',root,id,cmd,...(arg?[arg]:[])],{encoding:'utf8',timeout:10000,maxBuffer:131072});
  if(expect==='kill'){assert.equal(r.signal,'SIGKILL',r.stderr);checks++;return}
  if(expect==='fail'){assert.notEqual(r.status,0);assert.equal(r.signal,null);checks++;return}
  assert.equal(r.status,0,r.stderr);checks++;return JSON.parse(r.stdout);
 }
 const sync=(id,cut,expect)=>child(id,'sync',cut,expect),nonce=()=>randomBytes(32).toString('hex'),responses=(n,available=ids)=>ids.map(id=>available.includes(id)?child(id,'attest',n):null);
 const read=(n,r)=>readQuorum(h.journal,h.dir,r,n,h.env);
 const append=e=>{const before=h.journal.load();return h.journal.append(e,op,before.head)};
 const work=(kind,b)=>{const before=h.journal.load();return h.journal.append(h.journal.workEvent(kind,b,op,before),op,before.head)};
 try{
  for(const id of ids)sync(id);let n=nonce();assert.equal(read(n,responses(n)).certificate.count,0);checks++;
  const salt=randomBytes(32).toString('hex'),body={session:config.session,epoch:1,world:'aligned',suite:'phi026-eval-v1',commitment:hash([config.session,1,'aligned',27186,salt])};
  append({kind:'context',body,signature:contextSign('context',body)});
  sync('w0','before-link','kill');assert.equal(h.w('w0').load().body.count,0);checks++;
  sync('w0');sync('w1','after-link','kill');assert.equal(h.w('w1').load().body.count,1);checks++;
  n=nonce();assert.throws(()=>read(n,responses(n)));checks++; // available dissent
  n=nonce();assert.equal(read(n,responses(n,['w0','w1'])).certificate.count,1);checks++;
  n=nonce();assert.throws(()=>read(n,responses(n,['w0'])));checks++;
  sync('w2');n=nonce();const old=responses(n);assert.equal(read(n,old).certificate.count,1);assert.throws(()=>read(nonce(),old));checks+=2;
  const before=h.journal.load();work('reserve',{id:1,context:hash(before.state.current.state.context),seed:1,policy:'hybrid',artifact:h.journal.env.artifact,budget:20320});
  for(const id of ids)sync(id);n=nonce();const current=read(n,responses(n));assert.equal(current.state.totals.open,20320);checks++;
  const p=join(h.dir,'001.json'),saved=readFileSync(p);unlinkSync(p);
  assert.equal(h.journal.load().events.length,1);checks++;
  for(const id of ids)sync(id,undefined,'fail');n=nonce();assert.throws(()=>read(n,responses(n)));checks++;
  writeFileSync(p,saved);n=nonce();assert.equal(read(n,responses(n)).certificate.count,2);checks++;
  // Roll one witness back: available disagreement blocks admission; the two intact witnesses still attest current tip.
  const tail=join(root,'w0','002.json'),backup=readFileSync(tail);unlinkSync(tail);
  n=nonce();assert.throws(()=>read(n,responses(n)));checks++;
  n=nonce();assert.equal(read(n,responses(n,['w1','w2'])).certificate.count,2);checks++;
  writeFileSync(tail,backup);
  // Known trust limit: rolling back journal plus all witness suffixes can still pass.
  const tails=ids.map(id=>join(root,id,'002.json')),copies=tails.map(f=>readFileSync(f));tails.forEach(f=>unlinkSync(f));unlinkSync(p);
  n=nonce();assert.equal(read(n,responses(n)).certificate.count,1);checks++;
  tails.forEach((f,i)=>writeFileSync(f,copies[i]));writeFileSync(p,saved);
  n=nonce();assert.deepEqual(read(n,responses(n)).state.current.state.production,[4,4,4]);checks++;
  console.log(JSON.stringify({status:'passed',checks,witnesses:3,threshold:2,coordinatedRollbackLimit:true,head:current.certificate.head}));
 }finally{rmSync(root,{recursive:true,force:true})}
}
