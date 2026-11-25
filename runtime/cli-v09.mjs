import {report,checks,core,peerAPI} from './validate-v09.mjs';
const mode=process.argv[2]??'summary';
if(!['summary','test','gate'].includes(mode))throw Error('usage: summary|test|gate');
const r=report(core,peerAPI);
if(mode==='summary')console.log(JSON.stringify(r,null,2));
else if(mode==='test')console.log(JSON.stringify({passed:checks(r)},null,2));
else {
 const blockers={sparseFaultFalseAccepts:r.findings.blindFalseAccepts,unrecordedAborts:r.findings.unrecordedAbortCount,coherentAlternativeHistories:r.findings.coherentAlternativeAccepted};
 console.log(JSON.stringify({releaseReady:Object.values(blockers).every(x=>x===0),blockers},null,2));
 if(Object.values(blockers).some(x=>x!==0))process.exitCode=1;
}
