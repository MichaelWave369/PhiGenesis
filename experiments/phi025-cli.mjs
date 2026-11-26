import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {plan,guard,test} from './phi025-planner.mjs';
const [command,store,trust,anchor,witnessDir,seed,world,policy]=process.argv.slice(2);
function read(file,args){
 const r=spawnSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url)),...args],{encoding:'utf8',timeout:5000,maxBuffer:262144});
 if(r.status!==0||r.error)throw Error('inspection failed');return JSON.parse(r.stdout);
}
if(command==='test')console.log(JSON.stringify(test()));
else if(command==='plan'){
 if(!store||!trust||!anchor||!witnessDir||!seed||!world)throw Error('usage: plan store trust operator-anchor witness-dir seed world [policy]');
 const op=read('./phi023-cli.mjs',['inspect',store,trust,anchor]),w=read('./phi024-witness.mjs',['inspect',witnessDir,trust]);
 const state=guard(op,w);
 console.log(JSON.stringify({head:w.head,witnessHead:w.witnessHead,...plan(state,Number(seed),world,policy??'hybrid')}));
}else throw Error('command');
