import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {create,select,observe,checkpoint,restore,world,report,checks,peerAPI,previous} from './field-v06.mjs';
const [mode='summary',a='12',b='144',c='combined']=process.argv.slice(2);
if(mode==='summary'||mode==='test'){
 const result=report(peerAPI,previous,Number(a),Number(b));
 console.log(JSON.stringify(mode==='test'?{passed:checks(peerAPI,previous,result)}:result,null,2));
}else if(mode==='init'){
 if(existsSync(a))throw Error('checkpoint exists');
 writeFileSync(a,checkpoint(create(Number(b),c)),{flag:'wx'});
}else if(mode==='step'||mode==='inspect'){
 const s=restore(readFileSync(a,'utf8'));
 if(mode==='step'){
  const p=select(s),task=world(s.seed,s.events.length,'abrupt');
  observe(s,previous.execute(peerAPI,task,p.method));
  writeFileSync(a+'.tmp',checkpoint(s),{flag:'wx'});renameSync(a+'.tmp',a);
 }
 console.log(JSON.stringify(s,null,2));
}else throw Error('usage: summary|test [seeds] [rounds] | init [path] [seed] [decay|probe|combined] | step|inspect [path]');
