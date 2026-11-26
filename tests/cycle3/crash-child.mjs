// Deliberately killed by the integration test. Never used by the runtime CLI.
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {reserve,startReserved} from '../../runtime/cycle3/session.mjs';
const [directory,boundary]=process.argv.slice(2),key=Buffer.from(process.env.PHIGENESIS_CHECKPOINT_KEY,'hex');
function pause(at){
  if(at!==boundary)return;
  writeFileSync(join(directory,'test-boundary'),at);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);
}
if(boundary==='reserved'){reserve(directory,key);pause('reserved');}
else startReserved(directory,key,undefined,pause);
