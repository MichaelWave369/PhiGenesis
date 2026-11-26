import {sign,createPrivateKey} from 'node:crypto';
import {readFileSync} from 'node:fs';
const {proposal:p,keyPath}=JSON.parse(readFileSync(0,'utf8'));
for(const w of [p.incumbent,p.weights])if(!Array.isArray(w)||w.length!==3||!w.every(x=>[0,4,8].includes(x)))throw Error('weights');
const baseline=[],incumbent=[],candidate=[];let cost=0;
for(let c=0;c<3;c++){
 const label=(x,y)=>Math.floor((c===1?y:x)/3);
 const memories=Array.from({length:18},(_,i)=>{const x=i%9,y=(i*4+Math.floor(i/9)*2)%9;return {x,y,label:label(x,y)}});
 const queries=Array.from({length:9},(_,i)=>({x:i,y:(i+1)%9,label:label(i,(i+1)%9)}));
 const score=w=>{let n=0;for(const q of queries){let best=Infinity,result=-1;for(const m of memories){cost++;const d=w*Math.abs(q.x-m.x)+(8-w)*Math.abs(q.y-m.y);if(d<best){best=d;result=m.label}}if(result===q.label)n++}return n};
 baseline.push(score(4));incumbent.push(score(p.incumbent[c]));candidate.push(score(p.weights[c]));
}
const metrics={protocol:'phi023-eval-v1',cost,baseline,incumbent,candidate};
const signature=sign(null,Buffer.from(JSON.stringify([p,metrics])),createPrivateKey(readFileSync(keyPath))).toString('base64');
console.log(JSON.stringify({kind:'receipt',metrics,signature}));
