import {generateKeyPairSync,randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {openJournal,hash} from './phi028-journal.mjs';
import {makeDiscovery,domain as d27} from './phi027-provenance.mjs';
import {replay as v26} from './phi026-protocol.mjs';
const roles=['context','operator','evaluator','planner'];
function host(root){
 const config=JSON.parse(readFileSync(join(root,'trust.json'))),j=openJournal(join(root,'journal'),config),key=r=>join(root,r+'.pem'),op=j.signer('operator',key('operator'));
 const append=e=>{const b=j.load();return j.append(e,op,b.head)};
 const work=(kind,body)=>{const b=j.load();return j.append(j.workEvent(kind,body,op,b),op,b.head)};
 const signed=(kind,role,body,wrapped=false)=>({kind,body,signature:j.signer(role,key(role))(role,wrapped?d27(kind,body):body)});
 return {config,j,key,op,append,work,signed};
}
if(process.argv[2]==='worker'){
 const h=host(process.argv[3]),cut=process.argv[4],b=h.j.load(),p=b.state.pending;
 if(!p||p.status!=='reserved')throw Error('not reserved');
 h.work('start',{reservation:p.hash});
 if(cut==='after-start')process.kill(process.pid,'SIGKILL');
 const current=h.j.load(),d=makeDiscovery(current.state.legacy,{...h.j.env,replay:v26},p.seed,p.policy,h.j.signer('planner',h.key('planner')));
 if(cut==='after-work')process.kill(process.pid,'SIGKILL');
 h.append(d);console.log(JSON.stringify(h.j.load().state.totals));
}else{
 const root=mkdtempSync(join(tmpdir(),'phi028-'));mkdirSync(join(root,'journal'));
 const keys=Object.fromEntries(roles.map(r=>[r,generateKeyPairSync('ed25519')])),config={session:randomUUID(),...Object.fromEntries(roles.map(r=>[r,keys[r].publicKey.export({type:'spki',format:'pem'})]))};
 for(const r of roles)writeFileSync(join(root,r+'.pem'),keys[r].privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 writeFileSync(join(root,'trust.json'),JSON.stringify(config));
 const h=host(root),session=config.session;let checks=0;
 function child(cut,expected){const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'worker',root,cut],{encoding:'utf8',timeout:12000,maxBuffer:262144});if(expected==='kill')assert.equal(r.signal,'SIGKILL',r.stderr);else if(expected==='fail'){assert.notEqual(r.status,0);assert.equal(r.signal,null)}else assert.equal(r.status,0,r.stderr);checks++}
 const context=(epoch,world,seed,salt)=>h.signed('context','context',{session,epoch,world,suite:'phi026-eval-v1',commitment:hash([session,epoch,world,seed,salt])});
 function reserve(policy='hybrid'){const b=h.j.load().state;return h.work('reserve',{id:b.work.filter(w=>w.type==='planning').length+1,context:hash(b.current.state.context),seed:1,policy,artifact:h.j.env.artifact,budget:policy==='local'?16000:20320})}
 function abandon(){const p=h.j.load().state.pending;return h.work('abandon-work',{reservation:p.hash})}
 function submit(){const s=h.j.load().state,d=s.current.pendingDiscovery,p=h.signed('proposal','operator',{session,id:s.current.state.attempts+1,parent:s.current.state.nodes.length-1,context:hash(s.current.state.context),incumbent:s.current.state.shadow,...d.body.proposal,budget:2592});h.append(h.signed('submit','operator',{session,discovery:hash(d),proposal:p},true));return p}
 try{
  const salt=randomBytes(32).toString('hex'),c=context(1,'aligned',27186,salt);h.append(c);
  reserve();abandon();assert.equal(h.j.load().state.totals.unused,20320);checks++;
  reserve();child('after-start','kill');child('none','fail');assert.equal(h.j.load().state.pending.status,'started');checks++;abandon();
  reserve();child('after-work','kill');assert.equal(h.j.load().state.pending.status,'started');checks++;abandon();
  reserve();child('none','ok');const p=submit();assert.equal(h.j.load().state.evalWork.status,'reserved');checks++;
  h.work('eval-start',{proposal:hash(p)});
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('./phi026-evaluator.mjs',import.meta.url))],{input:JSON.stringify({context:c,proposal:p,trust:config,seed:27186,salt,keyPath:h.key('evaluator')}),encoding:'utf8',timeout:5000,maxBuffer:16384});assert.equal(r.status,0,r.stderr);checks++;
  const receipt=JSON.parse(r.stdout);h.append(receipt);h.append(h.signed('decision','operator',{session,proposal:hash(p),receipt:hash(receipt),choice:'approve'}));
  reserve('local');child('none','ok');assert.equal(h.j.load().state.current.discoveries.at(-1).outcome,'no-candidate');checks++;
  const salt2=randomBytes(32).toString('hex');h.append(context(2,'shifted',27187,salt2));reserve();child('none','ok');const p2=submit();h.work('eval-start',{proposal:hash(p2)});h.append(h.signed('decision','operator',{session,proposal:hash(p2),receipt:null,choice:'abandon'}));
  const end=h.j.load().state,t=end.totals;
  assert.equal(t.uncertain,2*20320+2592);assert.equal(t.open,0);assert.equal(t.reserved,t.completed+t.uncertain+t.unused);assert.deepEqual(end.current.state.shadow,[8,0,8]);assert.deepEqual(end.current.state.production,[4,4,4]);assert.equal(end.work.length,8);checks+=6;
  const f=join(root,'journal','001.json'),saved=readFileSync(f);writeFileSync(f,saved.toString()+' ');assert.throws(()=>h.j.load());writeFileSync(f,saved);checks++;
  console.log(JSON.stringify({status:'passed',checks,totals:t,work:end.work,production:end.current.state.production}));
 }finally{rmSync(root,{recursive:true,force:true})}
}
