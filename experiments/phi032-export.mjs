import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {run,restore} from './phi030-memory.mjs';
import {retrieve,verifyReport} from './phi031-altermath-bridge.mjs';
import {packet,test} from './phi032-packet.mjs';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const hash=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const [modulePath]=process.argv.slice(2);if(!modulePath)throw Error('Altermath module required');
const alt=await import(pathToFileURL(resolve(modulePath)).href),env={restore,runCausalScore:alt.runCausalScore,verifyCausalReceipts:alt.verifyCausalReceipts};
if(alt.CAUSAL_VERSION!=='Altermath.CausalBelt.R1')throw Error('version');
test();
const packets=[];
for(const epoch of [1,9,18,24]){
 const snapshot=run(7,'delayed','context-tagged',epoch);
 for(const context of [0,1,2]){
  const query={context,x:(epoch+context)%9,y:(epoch*2+context)%9,tag:Math.floor((epoch-1)/6)%2},report=retrieve(snapshot,query,env);
  if(!verifyReport(snapshot,query,report,env))throw Error('report replay');
  packets.push(packet(report,hash));
 }
}
console.log(JSON.stringify(packets));
