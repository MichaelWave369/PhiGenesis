import {openSync,closeSync,writeFileSync,readFileSync,fsyncSync,ftruncateSync,statSync} from 'node:fs';
import {dirname} from 'node:path';
import {seal,open} from './auth-v10.mjs';
const LIMIT=64*1024*1024,LINE_LIMIT=1024*1024;
function syncDir(path){const fd=openSync(dirname(path),'r');try{fsyncSync(fd);}finally{closeSync(fd);}}
function decode(line,key,seq,prev){
 const payload=open(line,key),p=JSON.parse(payload);
 if(p.seq!==seq||p.prev!==prev||!p.record||JSON.stringify({seq,prev,record:p.record})!==payload)throw Error('journal chain');
 return {record:p.record,mac:JSON.parse(line).mac};
}
export function openJournal(path,key,{expectedHead,repairTail=false}={}){
 if(statSync(path).size>LIMIT)throw Error('journal size');
 const bytes=readFileSync(path),end=bytes.lastIndexOf(10)+1;
 if(!end)throw Error('no complete header');
 const prefix=bytes.subarray(0,end).toString('utf8');
 const lines=prefix.slice(0,-1).split('\n'),records=[];let head=null;
 for(const line of lines){if(line.length>LINE_LIMIT)throw Error('line size');const r=decode(line,key,records.length,head);records.push(r.record);head=r.mac;}
 if(expectedHead!==undefined&&head!==expectedHead)throw Error('journal head pin');
 if(end!==bytes.length){
  if(!repairTail)throw Error('incomplete journal tail');
  const fd=openSync(path,'r+');try{ftruncateSync(fd,end);fsyncSync(fd);}finally{closeSync(fd);}
 }
 let size=end,broken=false;
 return {records,get head(){return head;},discardedTailBytes:bytes.length-end,append(record){
  if(broken)throw Error('journal writer failed; reopen required');
  const line=seal(JSON.stringify({seq:records.length,prev:head,record}),key),buf=Buffer.from(line+'\n','utf8');
  if(line.length>LINE_LIMIT||size+buf.length>LIMIT)throw Error('journal size');
  let fd;try{fd=openSync(path,'a');writeFileSync(fd,buf);fsyncSync(fd);}catch(e){broken=true;throw e;}finally{if(fd!==undefined)closeSync(fd);}
  size+=buf.length;head=JSON.parse(line).mac;records.push(JSON.parse(JSON.stringify(record)));
 }};
}
export function initJournal(path,key,seed,mode){
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff||!['cold','memory','peer','adaptive'].includes(mode))throw Error('configuration');
 return createJournal(path,key,{kind:'header',version:2,seed,mode});
}
// Shared authenticated storage only; each caller must validate its own protocol.
export function createJournal(path,key,record){
 const line=seal(JSON.stringify({seq:0,prev:null,record}),key);
 const fd=openSync(path,'wx',0o600);try{writeFileSync(fd,line+'\n','utf8');fsyncSync(fd);}finally{closeSync(fd);}
 syncDir(path);return openJournal(path,key);
}
