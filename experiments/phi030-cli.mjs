import {readFileSync,writeFileSync,openSync,closeSync,fsyncSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
import {run,step,restore,report,test} from './phi030-memory.mjs';
const [cmd,...a]=process.argv.slice(2);
function save(path,state){const tmp=path+'.next',fd=openSync(tmp,'wx',0o600);try{writeFileSync(fd,JSON.stringify(state));fsyncSync(fd)}finally{closeSync(fd)}renameSync(tmp,path);const d=openSync(dirname(path),'r');try{fsyncSync(d)}finally{closeSync(d)}}
if(cmd==='test')console.log(JSON.stringify(test()));
else if(cmd==='report')console.log(JSON.stringify(report(a[0]===undefined?90:Number(a[0]))));
else if(cmd==='init'){const [path,seed,regime,policy]=a;const s=run(Number(seed),regime,policy,0);save(path,s);console.log(JSON.stringify(s))}
else if(cmd==='advance'){const [path,count]=a;let s=restore(JSON.parse(readFileSync(path,'utf8')));const n=Number(count);if(!Number.isInteger(n)||n<1||s.next+n>24)throw Error('count');for(let i=0;i<n;i++){s=step(s);save(path,s)}console.log(JSON.stringify(s))}
else if(cmd==='inspect')console.log(JSON.stringify(restore(JSON.parse(readFileSync(a[0],'utf8')))));
else throw Error('command');
