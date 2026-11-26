// Operator-supplied local checkouts, never candidate-supplied executable paths.
import {readFileSync, readdirSync, lstatSync, realpathSync} from 'node:fs';
import {join, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {VERSION, exact, must, hash} from './protocol.mjs';

export const ROOT = resolve(fileURLToPath(new URL('../..',import.meta.url)));
export const PINS = Object.freeze({
  PhiGenesis:'22114dc95ee56b49cd23a5eeff1b8a0a3d1d972e',
  Agentora:'49166bb5365975d68df744678f91a837b0da48f2',
  Altermath:'99a40f6f8e6f4ded656dd3655778dfffa72a3754',
  PhiOS:'da87f8fe7d26036a61a97aca6eebc2afc2a747c3',
});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function git(root,args) {
  const r=spawnSync('git',['-C',root,...args],{encoding:'utf8',timeout:5000,maxBuffer:2000000,windowsHide:true});
  must(r.status === 0 && !r.error,'local source checkout unavailable');
  return r.stdout;
}
export function configCheck(c) {
  must(exact(c,['schema','authority','roots','python']) && c.schema === VERSION && c.authority === 'NONE'
    && exact(c.roots,Object.keys(PINS)) && typeof c.python === 'string', 'configuration');
  must(lstatSync(c.python).isFile() || lstatSync(c.python).isSymbolicLink(),'Python executable');
  return {...c, python:resolve(c.python), roots:Object.fromEntries(Object.keys(PINS).map(k=>[k,realpathSync(c.roots[k])]))};
}
function localFiles(dir) {
  return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const path=join(dir,e.name);
    if (e.name === '__pycache__') return [];
    must(!e.isSymbolicLink(),'symlink in runtime source');
    return e.isDirectory() ? localFiles(path) : e.isFile() ? [path] : [];
  });
}
export function sourceManifest(config) {
  const c=configCheck(config), repositories={};
  let bytes=0, files=0;
  function file(root,path) {
    const p=join(root,path);
    must(lstatSync(p).isFile() && realpathSync(p) === p,'nonregular source file');
    const b=readFileSync(p); bytes+=b.length; files++;
    must(bytes <= 100*1024*1024 && files <= 20000,'source inventory bound');
    return digest(b);
  }
  for (const [name,pin] of Object.entries(PINS)) {
    const root=c.roots[name];
    must(git(root,['rev-parse','HEAD']).trim() === pin,'source revision drift: '+name);
    must(git(root,['status','--porcelain','--untracked-files=no']).trim() === '','tracked source drift: '+name);
    // New importable files could shadow pinned packages despite an unchanged HEAD.
    const extras=git(root,['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean);
    must(!extras.some(p=>/\.(py|mjs|js|json)$/.test(p) && !p.split('/').includes('__pycache__')),
      'untracked source drift: '+name);
    // Bind all tracked checkout bytes, including transitive local imports.
    const paths=git(root,['ls-files','-z']).split('\0').filter(Boolean).sort();
    repositories[name]={revision:pin,files:Object.fromEntries(paths.map(p=>[p,file(root,p)]))};
  }
  const own=[...localFiles(join(ROOT,'runtime')),...localFiles(join(ROOT,'experiments'))].sort();
  const implementation=Object.fromEntries(own.map(p=>[relative(ROOT,p).replaceAll('\\','/'),file(ROOT,relative(ROOT,p))]));
  const manifest={schema:'cycle3-source-manifest/v1',nodeVersion:process.versions.node,repositories,implementation};
  return {manifest, hash:hash(manifest), bytes, files};
}
