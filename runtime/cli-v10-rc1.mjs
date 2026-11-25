import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {create,advance,checkpoint,restore,environment,report,checks,peerAPI,previous} from './field-v10-rc1.mjs';
import {seal,open} from './auth-v10.mjs';
const [mode='summary',a='rc1.json',b,c='adaptive']=process.argv.slice(2);
function key(){const hex=process.env.PHIGENESIS_CHECKPOINT_KEY;if(!/^[0-9a-fA-F]{64}$/.test(hex??''))throw Error('PHIGENESIS_CHECKPOINT_KEY must be 64 hex characters from a trusted key source');return Buffer.from(hex,'hex');}
function authChecks(){
 const k=Buffer.alloc(32,1),wrong=Buffer.alloc(32,2),s=create(peerAPI,123,"cold"),e=environment(123,0);
 const a=advance(peerAPI,previous,s,e.provider),b=advance(peerAPI,previous,s,{...e.provider,observe(actor,w,stage,x){return e.truth(actor,x)^1;}});
 const pa=checkpoint(a),pb=checkpoint(b),raw=seal(pa,k),pin=JSON.parse(raw).mac;
 assert.deepEqual(restore(peerAPI,previous,open(raw,k,pin)),a);
 assert.throws(()=>open(raw,wrong));
 const d=JSON.parse(raw);d.payload=pb;assert.throws(()=>open(JSON.stringify(d),k));
 assert.throws(()=>open(seal(pb,k),k,pin));
 assert.deepEqual(restore(peerAPI,previous,open(seal(pb,k),k)),b);
 assert.throws(()=>seal(pa,Buffer.alloc(31)));
 return 6;
}
if(['summary','test','gate'].includes(mode)){
 const r=report(peerAPI,previous);
 if(mode==='summary')console.log(JSON.stringify(r,null,2));
 else if(mode==='test')console.log(JSON.stringify({passed:checks(peerAPI,previous,r),authenticationAssertions:authChecks()},null,2));
 else{checks(peerAPI,previous,r);authChecks();console.log(JSON.stringify({releaseReady:false,scopedChecksPassed:true,blockers:['crash-durable attempted-work journal','independent review and trusted key lifecycle']},null,2));process.exitCode=1;}
}else if(mode==='init'){
 if(existsSync(a))throw Error('checkpoint exists');
 writeFileSync(a,seal(checkpoint(create(peerAPI,Number(b??'12345'),c)),key()),{flag:'wx',mode:0o600});
}else if(mode==='step'||mode==='inspect'){
 const k=key(),raw=readFileSync(a,'utf8');let s=restore(peerAPI,previous,open(raw,k,process.env.PHIGENESIS_EXPECTED_MAC));
 if(mode==='step'){const i=s.events.length;s=advance(peerAPI,previous,s,environment(s.seed,i,true,i%5===0).provider,Number(b??'192'));writeFileSync(a+'.tmp',seal(checkpoint(s),k),{flag:'wx',mode:0o600});renameSync(a+'.tmp',a);}
 console.log(JSON.stringify(s,null,2));
}else throw Error('usage: summary|test|gate | init [path] [seed] [mode] | step [path] [budget] | inspect [path]');
