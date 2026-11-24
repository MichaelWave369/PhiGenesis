import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { create, start, observe, predict, checkpoint, restore, report, checks } from './field.mjs';
const [mode='demo', path='genesis-checkpoint.json'] = process.argv.slice(2);
function save(s) {
  writeFileSync(path+'.tmp',checkpoint(s),{flag:'wx'});
  renameSync(path+'.tmp',path);
}
if(mode==='report') console.log(JSON.stringify(report(90),null,2));
else if(mode==='test') console.log(JSON.stringify({passed:checks()},null,2));
else if(['demo','resume','step'].includes(mode)) {
  let s;
  if(mode==='demo') {
    if(existsSync(path)) throw Error('checkpoint exists; use resume or a new path');
    s=create();
  } else s=restore(readFileSync(path,'utf8'));
  if(s.episode?.status!=='running') {start(s,'w1');save(s);}
  while(s.episode.status==='running'){
    const {x}=s.episode.pending;observe(s,x,predict(37,x));save(s);
    if(mode==='step')break;
  }
  console.log(JSON.stringify(s.episode,null,2));
} else if(mode==='init') {
  if(existsSync(path))throw Error('checkpoint exists');
  const s=create();start(s,'w1');save(s);console.log(JSON.stringify(s.episode,null,2));
} else throw Error('usage: init|demo|resume|step|report|test [checkpoint path]');
