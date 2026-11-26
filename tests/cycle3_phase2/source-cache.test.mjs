import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,utimesSync,statSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {sourceManifest} from '../../runtime/cycle3/sources.mjs';
const configPath=process.env.PHIGENESIS_PHASE2_CONFIG;
test('authenticated path cache preserves every file/byte hash and detects same-size timestamp-preserving drift',
 {skip:!configPath},()=>{
  const config=JSON.parse(readFileSync(configPath,'utf8')),full=sourceManifest(config),cached=sourceManifest(config,full.manifest);
  assert.deepEqual(cached,full);
  const p=join(config.roots.Altermath,'src/causal-belt.mjs'),bytes=readFileSync(p),st=statSync(p),changed=Buffer.from(bytes);changed[3]^=1;
  try{writeFileSync(p,changed);utimesSync(p,st.atime,st.mtime);assert.throws(()=>sourceManifest(config,full.manifest));}
  finally{writeFileSync(p,bytes);utimesSync(p,st.atime,st.mtime);}
  const extra=join(config.roots.Altermath,'src/fixture_untracked_injection.mjs');
  try{writeFileSync(extra,'export const authority="NONE";');assert.throws(()=>sourceManifest(config,full.manifest));}
  finally{unlinkSync(extra);}
});
