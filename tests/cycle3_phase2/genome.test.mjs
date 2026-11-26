import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hash} from '../../runtime/cycle3/protocol.mjs';
import {seedGenome,transformGenome,validateGenome,reconstructParent,qualifyGenome,CEILINGS} from '../../runtime/cycle3/genome.mjs';
const frame={actorId:randomUUID(),implementationHash:hash('runtime'),controlDigest:hash('control')};
const refs=[{nativeId:'a'.repeat(32),recordDigest:hash('native-a')},{nativeId:'b'.repeat(32),recordDigest:hash('native-b')}];
const catalog=new Map(refs.map(r=>[r.nativeId,r.recordDigest]));

test('finite NEST preserves actor/ceilings, retains original and reconstructs exact parent',()=>{
  const parent=seedGenome(frame,refs),copy=structuredClone(parent),r=transformGenome(parent,{op:'NEST',pocket:'a',parent:'b'},[],frame,catalog);
  assert.equal(r.paths.a,'root/b/a');assert.deepEqual(parent,copy);assert.equal(r.candidate.actorId,parent.actorId);
  assert.deepEqual(r.candidate.resourceCeilings,CEILINGS);assert.deepEqual(reconstructParent(r.candidate,r.receipt,frame,catalog),parent);
});
test('REVERSE twice restores relationship structure while lineage remains explicit',()=>{
  const parent=seedGenome(frame,refs),a=transformGenome(parent,{op:'REVERSE',relation:'ab'},[],frame,catalog),b=transformGenome(a.candidate,{op:'REVERSE',relation:'ab'},[],frame,catalog);
  assert.deepEqual(b.candidate.relations,parent.relations);assert.notEqual(hash(b.candidate),hash(parent));
  assert.deepEqual(reconstructParent(b.candidate,b.receipt,frame,catalog),a.candidate);
});
test('recall and same-pocket recombination require known ancestry and native record digests',()=>{
  const parent=seedGenome(frame,refs),changed=transformGenome(parent,{op:'NEST',pocket:'a',parent:'b'},[],frame,catalog);
  const recalled=transformGenome(changed.candidate,{op:'RECALL',ancestorDigest:hash(parent)},[parent],frame,catalog);
  assert.deepEqual(recalled.candidate.pockets,parent.pockets);
  const composed=transformGenome(changed.candidate,{op:'COMPOSE',pocket:'root',ancestorDigest:hash(parent)},[parent],frame,catalog);
  assert.equal(composed.candidate.pockets[0].memoryRefs.length,2);
  assert.throws(()=>transformGenome(parent,{op:'RECALL',ancestorDigest:hash(parent)},[parent],frame,catalog));
});
test('orphan, nested cycle, relation cycle, excessive depth and contradictions refuse',()=>{
  const parent=seedGenome(frame,refs);
  assert.throws(()=>transformGenome(parent,{op:'NEST',pocket:'a',parent:'a'},[],frame,catalog));
  const edits=[g=>{g.pockets[1].parent='missing';},g=>{g.relations.push({id:'ba',from:'b',to:'a',type:'depends'});},
    g=>{g.relations.push({id:'s',from:'a',to:'b',type:'supports'},{id:'c',from:'a',to:'b',type:'challenges'});},
    g=>{for(let i=0;i<7;i++)g.pockets.push({id:'deep'+i,parent:i?'deep'+(i-1):'a',memoryRefs:[]});}];
  for(const edit of edits){const g=structuredClone(parent);edit(g);assert.throws(()=>validateGenome(g,frame,catalog));}
});
test('authority, identity, evaluator, witness and ceiling fields cannot be introduced or changed',()=>{
  const parent=seedGenome(frame,refs);
  for(const [key,value]of [['actorId','other'],['implementationHash',hash('other')],['controlDigest',hash('other')],
    ['authority','ROOT'],['executionAuthority',true],['evaluator','changed'],['witnessConfiguration',{}],['approval',true]]){
    const g={...structuredClone(parent),[key]:value};assert.throws(()=>validateGenome(g,frame,catalog));
  }
  const g=structuredClone(parent);g.resourceCeilings.pockets++;assert.throws(()=>validateGenome(g,frame,catalog));
  assert.throws(()=>transformGenome(parent,{op:'NEST',pocket:'a',parent:'b',permissions:['execute']},[],frame,catalog));
});
test('unsupported ROTATE/FOLD/UNFOLD and forged memory/undo references refuse',()=>{
  const parent=seedGenome(frame,refs);
  for(const op of ['ROTATE','FOLD','UNFOLD','CREATE','RELATE','EXECUTE'])assert.throws(()=>transformGenome(parent,{op},[],frame,catalog));
  const g=structuredClone(parent);g.pockets[0].memoryRefs[0].recordDigest=hash('false');assert.throws(()=>validateGenome(g,frame,catalog));
  const r=transformGenome(parent,{op:'REVERSE',relation:'ab'},[],frame,catalog);r.receipt.undo.pockets[1].parent='b';
  assert.throws(()=>reconstructParent(r.candidate,r.receipt,frame,catalog));
});
