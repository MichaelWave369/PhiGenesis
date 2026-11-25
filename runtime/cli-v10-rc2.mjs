import {initJournal,openJournal} from './journal-disk-v10-rc2.mjs';
import {fold,reconstruct,recover,run,checks} from './journal-v10-rc2.mjs';
import * as core from './field-v10-rc1.mjs';
const {peerAPI,previous}=core;
const [mode='test',path='rc2.journal',arg,kind='adaptive']=process.argv.slice(2);
function key(){const h=process.env.PHIGENESIS_CHECKPOINT_KEY;if(!/^[0-9a-fA-F]{64}$/.test(h??''))throw Error('trusted 32-byte key required');return Buffer.from(h,'hex');}
function summary(j){const {folded:f,state}=reconstruct(core,peerAPI,previous,j.records);return {head:j.head,discardedTailBytes:j.discardedTailBytes,active:f.active,attempts:f.attempts,committedEvents:state.events.length,certifiedRelations:Object.keys(state.relations).length};}
if(mode==='test')console.log(JSON.stringify({passed:checks(core,peerAPI,previous)},null,2));
else if(mode==='gate'){console.log(JSON.stringify({releaseReady:false,blockers:['independent review and trusted key lifecycle','external latest-head storage and rollback policy','filesystem/power-loss and multi-writer qualification']},null,2));process.exitCode=1;}
else if(mode==='init')console.log(JSON.stringify(summary(initJournal(path,key(),Number(arg??12345),kind)),null,2));
else if(['inspect','recover','step'].includes(mode)){
 const j=openJournal(path,key(),{expectedHead:process.env.PHIGENESIS_EXPECTED_MAC,repairTail:mode==='recover'});
 if(mode==='recover'){reconstruct(core,peerAPI,previous,j.records);recover(j);}
 if(mode==='step'){const {folded:f,state}=reconstruct(core,peerAPI,previous,j.records);if(f.active)throw Error('unfinished attempt; run recover explicitly');const i=state.events.length;run(core,peerAPI,previous,j,core.environment(state.seed,i,true,i%5===0).provider,Number(arg??192));}
 console.log(JSON.stringify(summary(j),null,2));
}else throw Error('usage: test|gate | init [path] [seed] [mode] | inspect|recover [path] | step [path] [budget]');
