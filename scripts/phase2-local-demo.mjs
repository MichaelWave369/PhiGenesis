// Explicit disposable synthetic demonstration. Never enables a real service.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {initialize,advance,inspect,fullArtifact,performActivity,protectedRead} from '../runtime/cycle3/session.mjs';
import {referenceWitness,TRUST} from '../runtime/cycle3/continuity.mjs';
import {seedGenome} from '../runtime/cycle3/genome.mjs';
import {PHASE2_PINS} from '../runtime/cycle3/sources.mjs';
import {hash,must} from '../runtime/cycle3/protocol.mjs';
const [out,configPath]=process.argv.slice(2);must(out&&configPath,'Usage: phase2-local-demo.mjs NEW_DIRECTORY CONFIG');
const dir=resolve(out),config=JSON.parse(readFileSync(configPath,'utf8'));
must(config.schema==='PhiGenesis.CycleIII.v2','explicit v2 configuration required');
const raw=process.env.PHIGENESIS_CHECKPOINT_KEY;
must(raw===undefined||/^[a-f0-9]{64}$/.test(raw),'invalid provided demonstration key');
const key=raw?Buffer.from(raw,'hex'):randomBytes(32),transcript=[];
function note(command,report){transcript.push({command,status:report.status,records:report.journal.records});}
note('initialize',initialize(dir,config,key));for(let i=0;i<6;i++)note('core-'+(i+1),advance(dir,key));
const builder=fileURLToPath(new URL('../tests/cycle3_phase2/',import.meta.url));
const program='import sys,json; from pathlib import Path; sys.path.insert(0,sys.argv[1]); from test_native_memory import fixture; print(json.dumps(fixture(Path(sys.argv[2]))[0]))';
const fixture=spawnSync(config.python,['-I','-B','-c',program,builder,join(dir,'synthetic-native.sqlite3')],
  {encoding:'utf8',env:{...process.env,PHIGENESIS_PHASE2_NATIVE_ROOT:config.roots.PhiMemory9}});
must(fixture.status===0,'synthetic native fixture failed: '+fixture.stderr);const request=JSON.parse(fixture.stdout);
const pair=generateKeyPairSync('ed25519'),policy={schema:TRUST,witnessId:'local-demonstration',epoch:1,currentKeyId:'demo-key',
  keys:{'demo-key':{publicKeyPem:pair.publicKey.export({type:'spki',format:'pem'}),state:'active'}}};
const transport=await referenceWitness({root:config.roots.NBGPocketMesh,directory:join(dir,'same-host-reference-witness'),policy,privateKey:pair.privateKey});
note('checkpoint-1',await performActivity(dir,key,'checkpoint',{policy,previous:null},{transport}));
const cp1=fullArtifact(dir,key,'checkpoint').content.checkpoint;
note('native-memory',await performActivity(dir,key,'native-memory',request));
const native=fullArtifact(dir,key,'native-memory').content,r=inspect(dir,key);
const frame={actorId:r.session,implementationHash:JSON.parse(readFileSync(join(dir,'sources.json'),'utf8')).hash,controlDigest:r.sourceHash};
const parent=seedGenome(frame,native.references);
note('genome',await performActivity(dir,key,'genome',{parent,operation:{op:'NEST',pocket:'a',parent:'b'},ancestors:[]}));
note('checkpoint-2',await performActivity(dir,key,'checkpoint',{policy,previous:cp1.digest},{transport}));
const protectedState=await protectedRead(dir,key,{policy,transport}),final=inspect(dir,key),g=fullArtifact(dir,key,'genome').content;
const holds={};for(const r of native.references)for(const h of r.holds)holds[h]=(holds[h]??0)+1;
const evidence={schema:'Phase2.ExecutedLocalDemonstration.v1',authority:'NONE',release:'BLOCKED',
  environment:{node:process.version,platform:process.platform},pins:PHASE2_PINS,
  trustScope:'Same OS account and disposable witness directory; independent administration NOT ESTABLISHED.',
  keyScope:raw?'Operator supplied test session key; no private keys in this receipt.':'Ephemeral test keys intentionally not persisted; use an operator supplied key for later CLI inspection.',
  session:final.session,sourceHash:final.sourceHash,transcript,journal:final.journal,artifactDigests:final.artifacts,
  baseAccounting:final.totals,activityAccounting:final.activityTotals,activityCategories:final.activityByCategory,
  timings:final.activities.map(a=>({activity:a.stage,...a.diagnostics})),
  native:{databaseDigest:native.databaseDigest,counts:native.counts,holdCounts:holds,
    sources:native.sources.length,claims:native.claims.length,conflicts:native.conflicts.length,duplicateGroups:native.duplicateGroups.length},
  genome:{parentDigest:g.receipt.parentDigest,candidateDigest:g.receipt.candidateDigest,actorStable:g.candidate.actorId===final.session,
    paths:g.mapping.pocketPaths,nativeCompiler:g.mapping.altermathVersion,nativeAddressMapper:g.mapping.myceliumVersion},
  continuity:protectedState,checkpointDigests:[cp1.digest,fullArtifact(dir,key,'checkpoint').content.checkpoint.digest],
  preservation:'No native source database writes, provider calls, live executor, production promotion or license selection.'};
writeFileSync(join(dir,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
