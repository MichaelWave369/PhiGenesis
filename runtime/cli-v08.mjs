import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {create,advance,decide,checkpoint,restore,environment,report,checks,peerAPI} from './field-v08.mjs';
const [mode='summary',a='9',b='36',c='adaptive']=process.argv.slice(2);
if(mode==='summary'||mode==='test'){
 const r=report(peerAPI,Number(a),Number(b));
 console.log(JSON.stringify(mode==='test'?{passed:checks(peerAPI,r)}:r,null,2));
}else if(mode==='init'){
 if(existsSync(a))throw Error('checkpoint exists');
 writeFileSync(a,checkpoint(create(peerAPI,Number(b),c)),{flag:'wx'});
}else if(mode==='step'||mode==='inspect'){
 let s=restore(peerAPI,readFileSync(a,'utf8'));
 if(mode==='step'){
  const i=s.events.length;s=advance(peerAPI,s,environment(s.seed,i,i%7===0).provider);
  writeFileSync(a+'.tmp',checkpoint(s),{flag:'wx'});renameSync(a+'.tmp',a);
 }
 console.log(JSON.stringify(s,null,2));
}else throw Error('usage: summary|test [seeds] [rounds] | init [path] [seed] [adaptive|cold|memory|peer] | step|inspect [path]');
