import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {startActivity} from '../../runtime/cycle3/session.mjs';
import {referenceWitness} from '../../runtime/cycle3/continuity.mjs';
const [directory,boundary,credentialsPath]=process.argv.slice(2);
const config=JSON.parse(readFileSync(join(directory,'config.json'),'utf8'));
const key=Buffer.from(process.env.PHIGENESIS_CHECKPOINT_KEY,'hex');
let transport;
if(credentialsPath){
  const c=JSON.parse(readFileSync(credentialsPath,'utf8'));
  transport=await referenceWitness({root:config.roots.NBGPocketMesh,directory:c.directory,policy:c.policy,privateKey:c.privateKey});
}
await startActivity(directory,key,undefined,{transport,checkpointHook:at=>{
  if(at!==boundary)return;
  writeFileSync(join(directory,'test-boundary'),at);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);
}});
