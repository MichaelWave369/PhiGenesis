import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {create,select,observe,checkpoint,restore,makeBatch,execute,report,checks,peerAPI} from './field-v05.mjs';
const [mode='summary',arg='18',arg2='180']=process.argv.slice(2);
if(['summary','test'].includes(mode)){
 const result=report(peerAPI,Number(arg),Number(arg2));
 console.log(JSON.stringify(mode==='test'?{passed:checks(peerAPI,result)}:result,null,2));
}else if(mode==='init'){
 if(existsSync(arg))throw Error('checkpoint already exists');
 writeFileSync(arg,checkpoint(create(Number(arg2))),{flag:'wx'});
}else if(mode==='step'||mode==='inspect'){
 const s=restore(readFileSync(arg,'utf8'));
 if(mode==='step'){
  const decision=select(s),world=makeBatch(s.seed,s.events.length,true);
  observe(s,execute(peerAPI,world,decision.method));
  writeFileSync(arg+'.tmp',checkpoint(s),{flag:'wx'});renameSync(arg+'.tmp',arg);
 }
 console.log(JSON.stringify(s,null,2));
}else throw Error('usage: summary|test [seeds] [rounds] | init [path] [seed] | step|inspect [path]');
