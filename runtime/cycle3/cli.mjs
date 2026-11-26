import {readFileSync} from 'node:fs';
import {initialize,inspect,advance,reserve,startReserved,abandon,unlock,fullArtifact} from './session.mjs';
import {must,VERSION,BLOCKERS} from './protocol.mjs';

const [command,...args]=process.argv.slice(2);
try {
  if (command === 'gate') {
    console.log(JSON.stringify({schema:VERSION,authority:'NONE',release:'BLOCKED',blockers:BLOCKERS}));
    process.exitCode=1;
  } else {
    const allowed={init:2,inspect:1,next:1,reserve:1,start:1,abandon:2,unlock:2,artifact:2};
    must(Object.hasOwn(allowed,command) && args.length === allowed[command],'Usage: init DIR CONFIG | inspect DIR | next DIR | reserve DIR | start DIR | abandon DIR REASON | unlock DIR LOCK_SHA256 | artifact DIR STAGE | gate');
    const raw=process.env.PHIGENESIS_CHECKPOINT_KEY;
    must(typeof raw === 'string' && /^[a-f0-9]{64}$/.test(raw),'PHIGENESIS_CHECKPOINT_KEY must contain 32 bytes as lowercase hex');
    const key=Buffer.from(raw,'hex'),pin=process.env.PHIGENESIS_EXPECTED_MAC;
    let result;
    if (command === 'init') result=initialize(args[0],JSON.parse(readFileSync(args[1],'utf8')),key);
    else if (command === 'inspect') result=inspect(args[0],key,pin);
    else if (command === 'next') result=advance(args[0],key,pin);
    else if (command === 'reserve') result=reserve(args[0],key,pin);
    else if (command === 'start') result=startReserved(args[0],key,pin);
    else if (command === 'abandon') result=abandon(args[0],key,args[1],pin);
    else if (command === 'unlock') result=unlock(args[0],key,args[1],pin);
    else result=fullArtifact(args[0],key,args[1],pin);
    console.log(JSON.stringify(result));
  }
} catch(error) {
  console.error(JSON.stringify({status:'REFUSED',authority:'NONE',release:'BLOCKED',reason:error.message}));
  process.exitCode=1;
}
