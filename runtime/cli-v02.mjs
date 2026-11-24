import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { create, start, observe, oracle, checkpoint, restore, report, checks } from './field-v02.mjs';
const [mode='report', path='genesis-v02-checkpoint.json', world='w1'] = process.argv.slice(2);
const demo = {w1:{bias:0,terms:[3,5]},w2:{bias:1,terms:[5,6]},w3:{bias:1,terms:[3,6]},w4:{bias:0,terms:[3,12]}};
function save(s){writeFileSync(path+'.tmp',checkpoint(s),{flag:'wx'});renameSync(path+'.tmp',path);}
function begin(s,w){if(!Object.hasOwn(demo,w))throw Error('unknown demo world');start(s,w);save(s);}
if(mode==='report') console.log(JSON.stringify(report(90),null,2));
else if(mode==='test') console.log(JSON.stringify({passed:checks()},null,2));
else if(mode==='init'){if(existsSync(path))throw Error('checkpoint exists');const s=create();begin(s,world);console.log(JSON.stringify(s.episode,null,2));}
else if(['next','step','resume','inspect'].includes(mode)){
 const s=restore(readFileSync(path,'utf8'));
 if(mode==='next')begin(s,world);
 else if(mode!=='inspect'){
  if(!Object.hasOwn(demo,s.episode.world))throw Error('unknown demo world');
  while(s.episode.status==='running'){
   const {x}=s.episode.pending;observe(s,x,oracle(demo[s.episode.world],x));save(s);
   if(mode==='step')break;
  }
 }
 console.log(JSON.stringify(mode==='inspect'?s:s.episode,null,2));
}else throw Error('usage: init|next|step|resume|inspect|report|test [path] [world]');
