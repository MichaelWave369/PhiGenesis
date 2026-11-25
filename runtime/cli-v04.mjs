import {report,checks,peerAPI} from './field-v04.mjs';
const [mode='summary',train='18',test='30']=process.argv.slice(2);
if(!['report','summary','test'].includes(mode))throw Error('usage: summary|report|test [calibration seeds per context] [evaluation seeds per context]');
const result=report(peerAPI,Number(train),Number(test));
const {calibration,rows,...summary}=result;
console.log(JSON.stringify(mode==='test'?{passed:checks(peerAPI,result)}:mode==='report'?result:summary,null,2));
