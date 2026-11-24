import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { create, start, observe, predict, checkpoint, restore, report, checks } from './field.mjs';
const [mode='demo', path='genesis-checkpoint.json'] = process.argv.slice(2);
if(mode==='report') console.log(JSON.stringify(report(90),null,2));
else if(mode==='test') console.log(JSON.stringify({passed:checks()},null,2));
else if(mode==='demo') {
  const s=create();start(s,'w1');while(s.episode.status==='running'){const {x}=s.episode.pending;observe(s,x,predict(37,x));}
  writeFileSync(path+'.tmp',checkpoint(s),{flag:'wx'});renameSync(path+'.tmp',path);
  console.log(JSON.stringify(s.episode,null,2));
} else if(mode==='resume') {
  const s=restore(readFileSync(path,'utf8'));if(s.episode?.status!=='running')start(s,'w1');
  while(s.episode.status==='running'){const {x}=s.episode.pending;observe(s,x,predict(37,x));}
  writeFileSync(path+'.tmp',checkpoint(s),{flag:'wx'});renameSync(path+'.tmp',path);
  console.log(JSON.stringify(s.episode,null,2));
} else throw Error('usage: demo|resume|report|test [checkpoint path]');
