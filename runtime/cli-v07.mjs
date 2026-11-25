import {report,checks,peerAPI,previous,v06} from './field-v07.mjs';
const [mode='summary',a='9',b='144']=process.argv.slice(2);
if(!['summary','test'].includes(mode))throw Error('usage: summary|test [seeds] [rounds]');
const r=report(peerAPI,previous,v06,Number(a),Number(b));
console.log(JSON.stringify(mode==='test'?{passed:checks(peerAPI,previous,v06,r)}:r,null,2));
