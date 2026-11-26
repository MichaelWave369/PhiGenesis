import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync,randomBytes,randomUUID,sign} from 'node:crypto';
import {hash,canonical} from '../../runtime/cycle3/protocol.mjs';
import {TRUST,makeCheckpoint,referenceWitness,verifyContinuity} from '../../runtime/cycle3/continuity.mjs';

const root=process.env.PHIGENESIS_PHASE2_MESH_ROOT??resolve(fileURLToPath(new URL('../../../NBGPocketMesh',import.meta.url)));
const setup=()=>{
  const key=generateKeyPairSync('ed25519');
  const policy={schema:TRUST,witnessId:'research-witness',epoch:1,currentKeyId:'key-1',
    keys:{'key-1':{publicKeyPem:key.publicKey.export({type:'spki',format:'pem'}),state:'active'}}};
  const heads=[hash('journal-0'),hash('journal-1')];
  const view={session:randomUUID(),protocol:'PhiGenesis.CycleIII.v2',position:2,head:heads.at(-1),
    sourceHash:hash('sources'),runtimeManifestHash:hash('runtime'),configurationDigest:hash('config'),artifacts:{memory:hash('memory')}};
  return {key,policy,heads,view};
};
const nonce=()=>randomBytes(16).toString('hex');
async function verified(w,cp,view,heads,policy){const n=nonce();return verifyContinuity({root,checkpoint:cp,view,heads,policy,nonce:n,proofs:[await w.attest(n)]});}
function signedProof(key,policy,cp,n){
  const now=Date.now(),statement={schema:'NBGPocketMesh.ExternalAnchorStatement.v1',audience:'NBGPocketMesh.externally-anchored-executor.v1',
    nonce:n,epoch:cp.body.sequence,witnessSha256:cp.digest,issuedAtMs:now,expiresAtMs:now+5000};
  const payload={schema:'NBGPocketMesh.ExternalAnchorAttestation.v1',algorithm:'Ed25519',keyId:policy.currentKeyId,statement};
  return {...payload,signature:sign(null,Buffer.from(canonical(payload)),key.privateKey).toString('base64url')};
}

test('actual PocketMesh handler/verifier anchors session, manifest, configuration and inventory',async()=>{
  const d=mkdtempSync(join(tmpdir(),'phi037-'));try{
    const s=setup(),w=await referenceWitness({root,directory:d,policy:s.policy,privateKey:s.key.privateKey});
    const cp=makeCheckpoint(s.view,null,s.policy);assert.equal((await w.commit(cp,s.heads)).duplicate,false);
    const r=await verified(w,cp,s.view,s.heads,s.policy);
    assert.equal(r.authority,'NONE');assert.equal(r.executionAuthority,false);assert.equal(r.release,'BLOCKED');
    assert.equal(r.protectedRecords,2);assert.equal(r.administration,'NOT_ESTABLISHED_BY_THIS_INTERFACE');
    assert.equal((await w.commit(cp,s.heads)).duplicate,true);assert.deepEqual(w.latest(),cp);
  }finally{rmSync(d,{recursive:true,force:true});}
});
test('new checkpoint extends a protected prefix; old checkpoint cannot use a fresh latest proof',async()=>{
  const d=mkdtempSync(join(tmpdir(),'phi037-'));try{
    const s=setup(),w=await referenceWitness({root,directory:d,policy:s.policy,privateKey:s.key.privateKey});
    const first=makeCheckpoint(s.view,null,s.policy);await w.commit(first,s.heads);
    const heads=[...s.heads,hash('journal-2')],view={...s.view,position:3,head:heads.at(-1)},second=makeCheckpoint(view,first,s.policy);
    await w.commit(second,heads);await verified(w,second,view,heads,s.policy);
    await assert.rejects(()=>verified(w,first,s.view,heads,s.policy));
    await assert.rejects(()=>w.commit(first,s.heads));
    const fork=[hash('fork'),hash('other'),hash('journal-3')],bad=makeCheckpoint({...s.view,position:3,head:fork.at(-1)},first,s.policy);
    await assert.rejects(()=>w.commit(bad,fork));
  }finally{rmSync(d,{recursive:true,force:true});}
});
test('journal truncation, valid-prefix rollback, fork and artifact/session/config substitution refuse',async()=>{
  const d=mkdtempSync(join(tmpdir(),'phi037-'));try{
    const s=setup(),w=await referenceWitness({root,directory:d,policy:s.policy,privateKey:s.key.privateKey}),cp=makeCheckpoint(s.view,null,s.policy);
    await w.commit(cp,s.heads);
    for(const heads of [s.heads.slice(0,1),[s.heads[0],hash('fork')]])await assert.rejects(()=>verified(w,cp,s.view,heads,s.policy));
    for(const view of [{...s.view,session:randomUUID()},{...s.view,configurationDigest:hash('wrong-config')},
      {...s.view,runtimeManifestHash:hash('wrong-runtime')},{...s.view,artifacts:{memory:hash('substituted')}}])
      await assert.rejects(()=>verified(w,cp,view,s.heads,s.policy));
  }finally{rmSync(d,{recursive:true,force:true});}
});
test('challenge replay, conflicting attestations, invalid signatures and unavailability fail closed',async()=>{
  const d=mkdtempSync(join(tmpdir(),'phi037-'));try{
    const s=setup(),w=await referenceWitness({root,directory:d,policy:s.policy,privateKey:s.key.privateKey}),cp=makeCheckpoint(s.view,null,s.policy);
    await w.commit(cp,s.heads);const n=nonce(),proof=await w.attest(n);
    const args={root,checkpoint:cp,view:s.view,heads:s.heads,policy:s.policy,nonce:n};
    for(const proofs of [[],[null],[{...proof,signature:'x'.repeat(86)}]])await assert.rejects(()=>verifyContinuity({...args,proofs}));
    await assert.rejects(()=>verifyContinuity({...args,nonce:nonce(),proofs:[proof]}));
    const other={...cp,body:{...cp.body,sequence:2}};
    const conflict=signedProof(s.key,s.policy,other,n);
    await assert.rejects(()=>verifyContinuity({...args,proofs:[proof,conflict]}));
  }finally{rmSync(d,{recursive:true,force:true});}
});
test('key substitution and explicit rotation/revocation use current external policy',async()=>{
  const d=mkdtempSync(join(tmpdir(),'phi037-'));try{
    const s=setup(),w=await referenceWitness({root,directory:d,policy:s.policy,privateKey:s.key.privateKey}),first=makeCheckpoint(s.view,null,s.policy);
    await w.commit(first,s.heads);const nextKey=generateKeyPairSync('ed25519');
    await assert.rejects(()=>referenceWitness({root,directory:d,policy:s.policy,privateKey:nextKey.privateKey}));
    const substituted=structuredClone(s.policy);substituted.keys['key-1'].publicKeyPem=nextKey.publicKey.export({type:'spki',format:'pem'});
    await assert.rejects(()=>verified(w,first,s.view,s.heads,substituted));
    const policy={schema:TRUST,witnessId:s.policy.witnessId,epoch:2,currentKeyId:'key-2',keys:{
      'key-1':{...s.policy.keys['key-1'],state:'revoked'},
      'key-2':{publicKeyPem:nextKey.publicKey.export({type:'spki',format:'pem'}),state:'active'}}};
    const rotated=await referenceWitness({root,directory:d,policy,privateKey:nextKey.privateKey});
    const heads=[...s.heads,hash('after-rotation')],view={...s.view,position:3,head:heads.at(-1)},second=makeCheckpoint(view,first,policy);
    await rotated.commit(second,heads);await verified(rotated,second,view,heads,policy);
    await assert.rejects(()=>verified(rotated,first,s.view,heads,policy));
    await assert.rejects(()=>verified(rotated,second,view,heads,s.policy));
    assert.equal(second.body.witness.policyEpoch,2);assert.equal(second.body.executionAuthority,false);
  }finally{rmSync(d,{recursive:true,force:true});}
});
test('known limitation: coordinated local rollback defeats same-account reference witness',async()=>{
  const d=mkdtempSync(join(tmpdir(),'phi037-')),backup=d+'-backup';try{
    const s=setup(),w=await referenceWitness({root,directory:d,policy:s.policy,privateKey:s.key.privateKey}),first=makeCheckpoint(s.view,null,s.policy);
    await w.commit(first,s.heads);cpSync(d,backup,{recursive:true});
    const heads=[...s.heads,hash('new')],view={...s.view,position:3,head:heads.at(-1)},second=makeCheckpoint(view,first,s.policy);
    await w.commit(second,heads);
    rmSync(d,{recursive:true});cpSync(backup,d,{recursive:true});
    // Reproduced negative result: a fresh nonce cannot defeat rollback of both
    // independently-unprotected stores by their common administrator.
    const r=await verified(w,first,s.view,s.heads,s.policy);assert.equal(r.protectedRecords,2);
    assert.equal(r.administration,'NOT_ESTABLISHED_BY_THIS_INTERFACE');
  }finally{rmSync(d,{recursive:true,force:true});rmSync(backup,{recursive:true,force:true});}
});
