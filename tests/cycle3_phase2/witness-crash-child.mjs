import {readFileSync,writeFileSync} from 'node:fs';
import {referenceWitness} from '../../runtime/cycle3/continuity.mjs';
const [path,boundary]=process.argv.slice(2),c=JSON.parse(readFileSync(path,'utf8'));
const w=await referenceWitness({root:c.root,directory:c.directory,policy:c.policy,privateKey:c.privateKey,
  checkpointHook:at=>{if(at!==boundary)return;writeFileSync(c.marker,at);Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}});
await w.commit(c.checkpoint,c.heads);
