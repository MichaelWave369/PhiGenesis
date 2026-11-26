import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {run} from './phi030-memory.mjs';
const dir=mkdtempSync(join(tmpdir(),'phi030-')),path=join(dir,'memory.json');
function cli(args,ok=true){const r=spawnSync(process.execPath,[fileURLToPath(new URL('./phi030-cli.mjs',import.meta.url)),...args],{encoding:'utf8',timeout:20000,maxBuffer:1048576});if(!ok){assert.notEqual(r.status,0);return}assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)}
try{
 cli(['init',path,'7','delayed','context-tagged']);cli(['advance',path,'9']);const before=cli(['inspect',path]);assert.equal(before.next,9);assert.ok(before.pending.length>0);
 const after=cli(['advance',path,'15']);assert.deepEqual(after,run(7,'delayed','context-tagged'));assert.deepEqual(cli(['inspect',path]),after);
 const bytes=readFileSync(path,'utf8'),bad=JSON.parse(bytes);bad.memory[0].label=(bad.memory[0].label+1)%3;writeFileSync(path,JSON.stringify(bad));cli(['inspect',path],false);writeFileSync(path,bytes);
 console.log(JSON.stringify({status:'passed',restart:true,epochs:after.next,authority:after.authority}));
}finally{rmSync(dir,{recursive:true,force:true})}
