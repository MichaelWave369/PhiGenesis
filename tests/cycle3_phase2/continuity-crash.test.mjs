import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync,randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {hash} from '../../runtime/cycle3/protocol.mjs';
import {TRUST,makeCheckpoint,referenceWitness,verifyContinuity} from '../../runtime/cycle3/continuity.mjs';
const root=process.env.PHIGENESIS_PHASE2_MESH_ROOT;
const childPath=fileURLToPath(new URL('./witness-crash-child.mjs',import.meta.url));
for(const boundary of ['published','anchored'])test('actual witness SIGKILL after '+boundary+' recovers only by exact explicit resubmission',
 {skip:!root||process.platform==='win32',timeout:20000},async()=>{
  const d=mkdtempSync(join(tmpdir(),'witness-crash-'));let child;
  try{
    const pair=generateKeyPairSync('ed25519'),policy={schema:TRUST,witnessId:'research-witness',epoch:1,currentKeyId:'key-1',
      keys:{'key-1':{publicKeyPem:pair.publicKey.export({type:'spki',format:'pem'}),state:'active'}}};
    const heads=[hash('genesis')],view={session:randomUUID(),protocol:'PhiGenesis.CycleIII.v2',position:1,head:heads[0],
      sourceHash:hash('source'),runtimeManifestHash:hash('runtime'),configurationDigest:hash('config'),artifacts:{}};
    const cp=makeCheckpoint(view,null,policy),directory=join(d,'witness'),marker=join(d,'boundary'),path=join(d,'fixture-credentials.json');
    writeFileSync(path,JSON.stringify({root,directory,marker,policy,checkpoint:cp,heads,privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'})}),{mode:0o600});
    child=spawn(process.execPath,[childPath,path,boundary],{stdio:['ignore','ignore','pipe']});const ended=once(child,'exit');
    let errors='';child.stderr.on('data',b=>errors+=b);const deadline=Date.now()+10000;
    while(!existsSync(marker)){assert.equal(child.exitCode,null,errors);assert.ok(Date.now()<deadline,'witness boundary timeout');await new Promise(r=>setTimeout(r,10));}
    child.kill('SIGKILL');const [,signal]=await ended;assert.equal(signal,'SIGKILL');
    const w=await referenceWitness({root,directory,policy,privateKey:pair.privateKey});
    assert.equal(w.latest().digest,cp.digest);
    if(boundary==='published')await assert.rejects(()=>w.attest(randomBytes(16).toString('hex')));
    const duplicate=await w.commit(cp,heads);assert.equal(duplicate.duplicate,true);
    const nonce=randomBytes(16).toString('hex'),proof=await w.attest(nonce);
    const result=await verifyContinuity({root,checkpoint:cp,view,heads,policy,proofs:[proof],nonce});
    assert.equal(result.authority,'NONE');assert.equal(result.executionAuthority,false);
  }finally{if(child&&child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');rmSync(d,{recursive:true,force:true});}
});
