import {sign,createPrivateKey} from 'node:crypto';
import {readFileSync} from 'node:fs';
const {proposal:p,key}=JSON.parse(readFileSync(0,'utf8'));
if(!Array.isArray(p.weights)||p.weights.length!==3||!p.weights.every(w=>[0,4,8].includes(w)))throw Error('invalid weights');
// Frozen designed evaluator: 9 probes and 18 memories per context, two evaluations.
const reference=[],candidate=[];let cost=0;
for(let c=0;c<3;c++){
 const axis=c===1?1:0;
 const label=(x,y)=>Math.floor((axis?y:x)/3);
 const memories=Array.from({length:18},(_,i)=>{const x=i%9,y=(i*4+Math.floor(i/9)*2)%9;return {x,y,label:label(x,y)}});
 const queries=Array.from({length:9},(_,i)=>({x:i,y:(i*2+3)%9,label:label(i,(i*2+3)%9)}));
 const score=w=>{let n=0;for(const q of queries){let best=Infinity,result=-1;for(const m of memories){cost++;const d=w*Math.abs(q.x-m.x)+(8-w)*Math.abs(q.y-m.y);if(d<best){best=d;result=m.label}}if(result===q.label)n++}return n};
 reference.push(score(4));candidate.push(score(p.weights[c]));
}
const metrics={protocol:'phi022-eval-v1',cost,reference,candidate};
const signature=sign(null,Buffer.from(JSON.stringify([p,metrics])),createPrivateKey(key)).toString('base64');
console.log(JSON.stringify({kind:'receipt',metrics,signature}));
