import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {sourceManifest} from '../runtime/cycle3/sources.mjs';
const config=JSON.parse(readFileSync(process.argv[2],'utf8')),initial=sourceManifest(config),samples=[];
for(let i=0;i<9;i++){
  const sample={pair:i+1,order:i%2?'cached-first':'full-first'};
  for(const mode of i%2?['cached','full']:['full','cached']){
    const began=process.hrtime.bigint(),r=sourceManifest(config,mode==='cached'?initial.manifest:undefined);
    sample[mode+'Micros']=Number((process.hrtime.bigint()-began)/1000n);
    assert.equal(r.hash,initial.hash);assert.equal(r.bytes,initial.bytes);assert.equal(r.files,initial.files);
  }
  samples.push(sample);
}
const stats=mode=>{const values=samples.map(r=>r[mode+'Micros']).sort((a,b)=>a-b);return {minimum:values[0],median:values[4],maximum:values[8]};};
console.log(JSON.stringify({schema:'Phase2.PathInventoryCacheExperiment.v1',scope:'Internal local timing; all covered bytes rehashed, no content/mtime cache',
  pairs:9,coveredBytesPerScan:initial.bytes,coveredFiles:initial.files,manifestDigest:initial.hash,samples,
  full:stats('full'),cached:stats('cached'),nativeNode:process.version,platform:process.platform,
  limitations:'Timing variability, shared host and small cohort; no general speed, energy, or complete-runtime efficiency claim.'},null,2));
