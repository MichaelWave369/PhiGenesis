// Research-domain adapter over the existing PocketMesh R11 digest anchor.
// No listener, executor, deployment, authority grant, or automatic key rotation.
import {createHash,createPublicKey,createPrivateKey,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,openSync,closeSync,fsyncSync,linkSync,unlinkSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {hash,canonical,exact,must,isHash,uint} from './protocol.mjs';

export const CHECKPOINT='PhiGenesis.ResearchCheckpoint.v1';
export const TRUST='PhiGenesis.ResearchWitnessTrust.v1';
const token=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._-]{0,63}$/.test(x);
export const fingerprint=key=>{
  const k=key?.type==='public'?key:createPublicKey(key);
  must(k.asymmetricKeyType==='ed25519','Ed25519 witness required');
  return createHash('sha256').update(k.export({type:'spki',format:'der'})).digest('hex');
};
export function trustCheck(policy){
  must(exact(policy,['schema','witnessId','epoch','currentKeyId','keys'])&&policy.schema===TRUST
    &&token(policy.witnessId)&&uint(policy.epoch)&&policy.epoch>0&&policy.epoch<=256
    &&token(policy.currentKeyId)&&policy.keys&&typeof policy.keys==='object'&&!Array.isArray(policy.keys)
    &&Object.keys(policy.keys).length>0&&Object.keys(policy.keys).length<=9,'witness policy');
  for(const [id,r]of Object.entries(policy.keys)){
    must(token(id)&&exact(r,['publicKeyPem','state'])&&typeof r.publicKeyPem==='string'
      &&r.publicKeyPem.length<=1024&&['active','revoked'].includes(r.state),'witness key policy');
    fingerprint(r.publicKeyPem);
  }
  must(policy.keys[policy.currentKeyId]?.state==='active','current witness key revoked or missing');
  return policy;
}
export function viewCheck(view){
  must(exact(view,['session','protocol','position','head','sourceHash','runtimeManifestHash','configurationDigest','artifacts'])
    &&typeof view.session==='string'&&/^[a-f0-9-]{36}$/.test(view.session)
    &&['PhiGenesis.CycleIII.v1','PhiGenesis.CycleIII.v2'].includes(view.protocol)
    &&uint(view.position)&&view.position>0&&view.position<=64
    &&['head','sourceHash','runtimeManifestHash','configurationDigest'].every(k=>isHash(view[k]))
    &&view.artifacts&&typeof view.artifacts==='object'&&!Array.isArray(view.artifacts)
    &&Object.keys(view.artifacts).length<=9
    &&Object.entries(view.artifacts).every(([k,v])=>/^[a-z][a-z-]{0,31}$/.test(k)&&isHash(v)),'checkpoint view');
  return view;
}
export function checkpointCheck(cp){
  must(exact(cp,['body','digest'])&&exact(cp.body,['schema','view','sequence','previous','witness','authority','operationalAuthority','executionAuthority','release']), 'checkpoint shape');
  const b=cp.body;viewCheck(b.view);
  must(b.schema===CHECKPOINT&&uint(b.sequence)&&b.sequence>0&&b.sequence<=64
    &&(b.previous===null||isHash(b.previous))
    &&exact(b.witness,['id','keyId','fingerprint','policyEpoch','policyDigest'])
    &&token(b.witness.id)&&token(b.witness.keyId)&&isHash(b.witness.fingerprint)&&isHash(b.witness.policyDigest)
    &&uint(b.witness.policyEpoch)&&b.witness.policyEpoch>0&&b.witness.policyEpoch<=256
    &&b.authority==='NONE'&&b.operationalAuthority===false&&b.executionAuthority===false&&b.release==='BLOCKED'
    &&cp.digest===hash([CHECKPOINT,b]),'checkpoint integrity/authority');
  return cp;
}
export function makeCheckpoint(view,previous,policy){
  viewCheck(view);trustCheck(policy);
  if(previous){
    checkpointCheck(previous);
    const p=previous.body;
    must(p.view.session===view.session&&p.view.protocol===view.protocol&&p.view.sourceHash===view.sourceHash
      &&p.view.runtimeManifestHash===view.runtimeManifestHash&&p.view.configurationDigest===view.configurationDigest
      &&view.position>p.view.position,'checkpoint session/revision regression');
  }
  const body={schema:CHECKPOINT,view:structuredClone(view),sequence:previous?previous.body.sequence+1:1,
    previous:previous?.digest??null,witness:{id:policy.witnessId,keyId:policy.currentKeyId,
      fingerprint:fingerprint(policy.keys[policy.currentKeyId].publicKeyPem),policyEpoch:policy.epoch,policyDigest:hash(policy)},
    authority:'NONE',operationalAuthority:false,executionAuthority:false,release:'BLOCKED'};
  return checkpointCheck({body,digest:hash([CHECKPOINT,body])});
}
function currentPolicy(cp,policy){
  checkpointCheck(cp);trustCheck(policy);
  const w=cp.body.witness;
  must(w.id===policy.witnessId&&w.keyId===policy.currentKeyId&&w.policyEpoch===policy.epoch
    &&w.policyDigest===hash(policy)&&w.fingerprint===fingerprint(policy.keys[w.keyId].publicKeyPem),
    'checkpoint witness key/policy substitution or revocation');
}
const modules=new Map();
async function anchorModule(root){
  root=resolve(root);
  if(!modules.has(root))modules.set(root,import(pathToFileURL(join(root,'src/pocket-external-anchor.mjs')).href));
  return modules.get(root);
}
export async function verifyContinuity({root,checkpoint,view,heads,policy,proofs,nonce}){
  currentPolicy(checkpoint,policy);viewCheck(view);
  must(hash(view)===hash(checkpoint.body.view),'session/artifact/configuration substitution');
  must(Array.isArray(heads)&&heads.length>=view.position&&heads.length<=64&&heads.every(isHash)
    &&heads[view.position-1]===view.head,'journal rollback, truncation or fork');
  must(Array.isArray(proofs)&&proofs.length>0&&proofs.length<=3&&proofs.every(p=>p!==null),'witness unavailable');
  const native=await anchorModule(root);
  const checked=proofs.map(proof=>native.verifyExternalAnchorProof({proof,nonce,
    clientConfig:{keyId:policy.currentKeyId,key:createPublicKey(policy.keys[policy.currentKeyId].publicKeyPem),maxAgeMs:5000},
    // R11's policyEpoch is used ONLY as an opaque monotonic anchor slot here.
    // Its witnessSha256 slot contains this research checkpoint's digest.
    local:{policyEpoch:checkpoint.body.sequence,witnessSha256:checkpoint.digest,checkpointSha256:checkpoint.digest}}));
  return {schema:'PhiGenesis.ProtectedContinuityRead.v1',authority:'NONE',executionAuthority:false,
    release:'BLOCKED',checkpointDigest:checkpoint.digest,protectedRecords:view.position,
    unprotectedTailRecords:heads.length-view.position,proofDigests:checked.map(r=>r.anchorAttestationSha256),
    administration:'NOT_ESTABLISHED_BY_THIS_INTERFACE'};
}
function syncDir(dir){if(process.platform!=='win32'){const fd=openSync(dir,'r');try{fsyncSync(fd);}finally{closeSync(fd);}}}
function publish(path,value){
  const tmp=path+'.'+randomUUID()+'.tmp',fd=openSync(tmp,'wx',0o600);
  try{writeFileSync(fd,canonical(value));fsyncSync(fd);}finally{closeSync(fd);}
  try{linkSync(tmp,path);syncDir(resolve(path,'..'));}finally{unlinkSync(tmp);}
}
/** Explicit local reference only. It reuses native R11 storage and its actual
 * read-only handler in-process. It never starts HTTP/mTLS or provisions a host.
 * The caller is a trusted publisher; R13 authenticated transport is not emulated.
 */
export async function referenceWitness({root,directory,policy,privateKey,checkpointHook=()=>{}}){
  trustCheck(policy);
  const native=await anchorModule(root),key=privateKey?.type==='private'?privateKey:createPrivateKey(privateKey);
  must(fingerprint(createPublicKey(key))===fingerprint(policy.keys[policy.currentKeyId].publicKeyPem),'wrong witness private key');
  directory=resolve(directory);
  if(!existsSync(directory))mkdirSync(directory,{mode:0o700});
  must(lstatSync(directory).isDirectory()&&(process.platform==='win32'||(lstatSync(directory).mode&0o077)===0),'protected reference witness directory required');
  const store=join(directory,'checkpoints'),anchor=join(directory,'anchor');
  for(const dir of [store,anchor]){
    if(!existsSync(dir))mkdirSync(dir,{mode:0o700});
    const st=lstatSync(dir);must(st.isDirectory()&&(process.platform==='win32'||(st.mode&0o077)===0),'protected witness subdirectory required');
  }
  const name=n=>'checkpoint-'+String(n).padStart(3,'0')+'.json';
  function history(){
    const files=readdirSync(store).filter(f=>!f.endsWith('.tmp')).sort();
    must(files.length<=64,'checkpoint history bound');let previous=null;
    for(const [i,file]of files.entries()){
      must(file===name(i+1),'checkpoint history gap');
      const path=join(store,file),st=lstatSync(path);must(st.isFile()&&st.size<=32768,'checkpoint file');
      const raw=readFileSync(path,'utf8'),cp=checkpointCheck(JSON.parse(raw));
      must(raw===canonical(cp)&&cp.body.sequence===i+1&&cp.body.previous===(previous?.digest??null),'checkpoint chain');
      if(previous)must(cp.body.view.session===previous.body.view.session&&cp.body.view.position>previous.body.view.position,'witness history fork');
      previous=cp;
    }
    return previous;
  }
  function tip(){return readdirSync(anchor).length?native.inspectAnchor(anchor):null;}
  function anchorExact(cp){
    const t=tip();
    if(t?.epoch===cp.body.sequence){must(t.witnessSha256===cp.digest,'conflicting anchored checkpoint');return t;}
    must((t?.epoch??0)===cp.body.sequence-1,'anchor/checkpoint gap');
    return t?native.advanceExternalAnchor(anchor,cp.body.sequence,cp.digest):native.initializeExternalAnchor(anchor,cp.digest);
  }
  return {
    latest:()=>history(),
    async commit(cp,heads){
      currentPolicy(cp,policy);
      must(Array.isArray(heads)&&heads.every(isHash)&&heads.length===cp.body.view.position
        &&heads.at(-1)===cp.body.view.head,'exact publisher prefix required');
      const previous=history();
      if(previous?.digest===cp.digest){anchorExact(cp);return {duplicate:true,digest:cp.digest};}
      if(previous){
        const t=tip();must(t?.epoch===previous.body.sequence&&t.witnessSha256===previous.digest,'retry unanchored exact checkpoint first');
        must(cp.body.sequence===previous.body.sequence+1&&cp.body.previous===previous.digest
          &&cp.body.view.session===previous.body.view.session&&cp.body.view.protocol===previous.body.view.protocol
          &&cp.body.view.sourceHash===previous.body.view.sourceHash&&cp.body.view.runtimeManifestHash===previous.body.view.runtimeManifestHash
          &&cp.body.view.configurationDigest===previous.body.view.configurationDigest
          &&cp.body.witness.id===previous.body.witness.id&&cp.body.witness.policyEpoch>=previous.body.witness.policyEpoch
          &&cp.body.view.position>previous.body.view.position&&heads[previous.body.view.position-1]===previous.body.view.head,'stale, forked or substituted checkpoint');
        if(cp.body.witness.policyEpoch===previous.body.witness.policyEpoch)must(cp.body.witness.fingerprint===previous.body.witness.fingerprint,'key rotation requires explicit policy epoch');
      }else must(cp.body.sequence===1&&cp.body.previous===null,'explicit checkpoint bootstrap required');
      publish(join(store,name(cp.body.sequence)),cp);checkpointHook('published');
      anchorExact(cp);checkpointHook('anchored');
      return {duplicate:false,digest:cp.digest};
    },
    async attest(nonce){
      must(typeof nonce==='string'&&/^[a-f0-9]{32}$/.test(nonce),'fresh nonce required');
      const cp=history(),t=tip();must(cp&&t?.epoch===cp.body.sequence&&t.witnessSha256===cp.digest,'unanchored reference witness');
      currentPolicy(cp,policy);
      const handler=native.createReadOnlyAnchorHandler({directory:anchor,privateKey:key,keyId:policy.currentKeyId});
      let status,body;
      handler({method:'GET',url:'/v1/attest?nonce='+nonce},{writeHead:s=>{status=s;},end:b=>{body=b;}});
      must(status===200,'witness unavailable');return JSON.parse(body);
    },
  };
}
