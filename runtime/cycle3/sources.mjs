// Operator-supplied local checkouts, never candidate-supplied executable paths.
import {readFileSync, readdirSync, lstatSync, realpathSync} from 'node:fs';
import {join, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {VERSION, exact, must, hash} from './protocol.mjs';
import {VERSION2} from './activities.mjs';

export const ROOT = resolve(fileURLToPath(new URL('../..',import.meta.url)));
export const PINS = Object.freeze({
  PhiGenesis:'22114dc95ee56b49cd23a5eeff1b8a0a3d1d972e',
  Agentora:'49166bb5365975d68df744678f91a837b0da48f2',
  Altermath:'99a40f6f8e6f4ded656dd3655778dfffa72a3754',
  PhiOS:'da87f8fe7d26036a61a97aca6eebc2afc2a747c3',
});
export const PHASE2_PINS=Object.freeze({...PINS,
  PhiMemory9:'5cba675a3a439023a3ff374c238dd6e4339e3a55',
  NBGPocketMesh:'0687f10970989194d4af554d9b189c7ce8a1ad15',
});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function git(root,args) {
  const r=spawnSync('git',['-C',root,...args],{encoding:'utf8',timeout:5000,maxBuffer:2000000,windowsHide:true});
  must(r.status === 0 && !r.error,'local source checkout unavailable');
  return r.stdout;
}
export function configCheck(c) {
  const pins=c?.schema===VERSION2?PHASE2_PINS:PINS;
  must(exact(c,['schema','authority','roots','python']) && [VERSION,VERSION2].includes(c.schema) && c.authority === 'NONE'
    && exact(c.roots,Object.keys(pins)) && typeof c.python === 'string', 'configuration');
  must(lstatSync(c.python).isFile() || lstatSync(c.python).isSymbolicLink(),'Python executable');
  return {...c, python:resolve(c.python), roots:Object.fromEntries(Object.keys(pins).map(k=>[k,realpathSync(c.roots[k])]))};
}
function localFiles(dir) {
  return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const path=join(dir,e.name);
    if (e.name === '__pycache__') return [];
    must(!e.isSymbolicLink(),'symlink in runtime source');
    return e.isDirectory() ? localFiles(path) : e.isFile() ? [path] : [];
  });
}
export function sourceManifest(config,inventory) {
  const c=configCheck(config), repositories={};
  let bytes=0, files=0;
  function file(root,path) {
    const p=join(root,path);
    const st=lstatSync(p);
    must(st.isFile() && realpathSync(p) === p,'nonregular source file');
    must(bytes+st.size<=100*1024*1024&&files<20000,'source inventory bound before read');
    const b=readFileSync(p); bytes+=b.length; files++;
    must(bytes <= 100*1024*1024 && files <= 20000,'source inventory bound');
    return digest(b);
  }
  const pins=c.schema===VERSION2?PHASE2_PINS:PINS;
  for (const [name,pin] of Object.entries(pins)) {
    const root=c.roots[name];
    must(git(root,['rev-parse','HEAD']).trim() === pin,'source revision drift: '+name);
    must(git(root,['status','--porcelain','--untracked-files=no']).trim() === '','tracked source drift: '+name);
    // New importable files could shadow pinned packages despite an unchanged HEAD.
    const extras=git(root,['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean);
    must(!extras.some(p=>/\.(py|mjs|js|json)$/.test(p) && !p.split('/').includes('__pycache__')),
      'untracked source drift: '+name);
    // Bind all tracked checkout bytes, including transitive local imports.
    const cached=inventory?.repositories?.[name];
    if(cached)must(cached.revision===pin,'cached inventory revision');
    // Cache ONLY the header-authenticated tracked path inventory. All covered
    // bytes are re-read/re-hashed; revision/dirty/untracked checks still run.
    const paths=cached?Object.keys(cached.files).sort():git(root,['ls-files','-z']).split('\0').filter(Boolean).sort();
    repositories[name]={revision:pin,files:Object.fromEntries(paths.map(p=>[p,file(root,p)]))};
  }
  const own=[...localFiles(join(ROOT,'runtime')),...localFiles(join(ROOT,'experiments'))].sort();
  const implementation=Object.fromEntries(own.map(p=>[relative(ROOT,p).replaceAll('\\','/'),file(ROOT,relative(ROOT,p))]));
  const manifest={schema:'cycle3-source-manifest/v1',nodeVersion:process.versions.node,repositories,implementation};
  return {manifest, hash:hash(manifest), bytes, files};
}
