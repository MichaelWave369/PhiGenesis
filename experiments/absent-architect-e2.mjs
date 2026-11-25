// ΦGenesis Absent Architect E2 — adaptive local observation and scoped Keyholes.
function experiment(){
  const ids=Array.from({length:9},(_,i)=>i), cues=[0,1,3], held=ids.filter(x=>!cues.includes(x)), budgets=[3,6,9,18], regimes=["clean","noisy","scrambled"], policies=["adaptive","fixed","blind"];
  const mod=x=>((x%3)+3)%3;
  function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
  const family=Array.from({length:36},(_,i)=>({r:Math.floor(i/9),b:i%9}));
  function transform(c,h){let x=c%3,y=Math.floor(c/3);for(let i=0;i<h.r;i++)[x,y]=[-y,x];return mod(x+h.b%3)+3*mod(y+Math.floor(h.b/3))}
  function oracle(c,h){const x=c%3,y=Math.floor(c/3),v=[[x,y],[-y,x],[-x,-y],[y,-x]][h.r];return mod(v[0]+h.b%3)+3*mod(v[1]+Math.floor(h.b/3))}
  const queries=cues.flatMap(c=>ids.map(child=>({c,child})));
  function fixture(seed){const r=rng(seed);return ids.map(root=>{const h=family[r(36)];return {root,h,noise:Array.from({length:18},()=>r(10)===0),scrambled:held.map(()=>r(9)),blind:held.map(()=>r(9))}})}
  function keyhole(root,budget,regime){
    if(!budgets.includes(budget)||!regimes.includes(regime))throw Error("invalid configuration");
    let remaining=budget;const events=[];
    function request(q){
      let reason=null;
      if(!q||typeof q!=="object"||Object.keys(q).sort().join(",")!=="c,child,op,root"||!Number.isInteger(q.root)||!Number.isInteger(q.c)||!Number.isInteger(q.child))reason="malformed";
      else if(q.op!=="observe")reason="unsupported";
      else if(q.root!==root.root)reason="foreign-root";
      else if(!cues.includes(q.c)||!ids.includes(q.child))reason="outside-training";
      else if(!remaining)reason="budget";
      if(reason){const e={actor:root.root,decision:"REFUSE",reason,remaining};events.push(e);return e}
      const step=budget-remaining;const truth=Number(oracle(q.c,root.h)===q.child);const bit=truth^Number(regime==="noisy"&&root.noise[step]);remaining--;
      const e={actor:root.root,decision:"OBSERVE",c:q.c,child:q.child,bit,remaining};events.push(e);return e
    }
    return {request,events,remaining:()=>remaining};
  }
  const mass=(w,q)=>w.reduce((s,v,i)=>s+(transform(q.c,family[i])===q.child?v:0),0);
  function select(w,used){let best=null,score=-1;for(const q of queries){const k=q.c*9+q.child;if(used.has(k))continue;const p=mass(w,q),s=Math.min(p,1-p);if(s>score+1e-12){best=q;score=s}}return best}
  function learn(root,budget,regime,policy){
    if(!policies.includes(policy))throw Error("unknown policy");
    const port=keyhole(root,budget,regime),w=Array(36).fill(1/36),used=new Set(),eps=regime==="noisy"?.1:0;
    if(policy!=="blind")for(let t=0;t<budget;t++){
      const q=policy==="adaptive"?select(w,used):queries[t];
      used.add(q.c*9+q.child);
      const e=port.request({op:"observe",root:root.root,...q});
      if(e.decision!=="OBSERVE")throw Error("unexpected refusal");
      for(let i=0;i<w.length;i++)w[i]*=Number(transform(q.c,family[i])===q.child)===e.bit?1-eps:eps;
      const sum=w.reduce((a,b)=>a+b,0);if(!sum)throw Error("empty posterior");for(let i=0;i<w.length;i++)w[i]/=sum;
    }
    let correct=0,brier=0,confidence=0;
    for(let j=0;j<held.length;j++){
      const probs=ids.map(child=>mass(w,{c:held[j],child}));
      const pred=policy==="blind"?root.blind[j]:probs.indexOf(Math.max(...probs));
      const target=regime==="scrambled"?root.scrambled[j]:oracle(held[j],root.h);
      correct+=Number(pred===target);confidence+=probs[pred];
      brier+=probs.reduce((s,p,i)=>s+(p-Number(i===target))**2,0);
    }
    const reads=budget-port.remaining(),max=Math.max(...w),ties=w.filter(v=>Math.abs(v-max)<1e-10).length;
    return {correct,reads,net:3*correct-reads,brier:brier/6,confidence:confidence/6,uniqueCorrect:Number(ties===1&&family[w.indexOf(max)]===root.h),events:port.events};
  }
  function report(seeds=90){
    if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed budget");
    const rows=[];for(const regime of regimes)for(const budget of budgets)for(const policy of policies){
      const sum={correct:0,reads:0,net:0,brier:0,confidence:0,uniqueCorrect:0};
      for(let seed=1;seed<=seeds;seed++)for(const root of fixture(seed)){const v=learn(root,budget,regime,policy);for(const k of Object.keys(sum))sum[k]+=v[k]}
      const n=seeds*9;rows.push({regime,budget,policy,accuracy:sum.correct/(6*n),...Object.fromEntries(Object.keys(sum).filter(k=>k!=="correct").map(k=>[k,sum[k]/n]))});
    }
    return {schema:"absent-architect-e2-v1",status:"SIMULATED",authority:"NONE",seeds,rows}
  }
  function test(){
    let checks=0;const assert=(x,m)=>{if(!x)throw Error(m);checks++};
    for(const h of family)for(const c of ids)assert(transform(c,h)===oracle(c,h),"independent oracle");
    const root=fixture(7)[0],port=keyhole(root,3,"clean"),q={op:"observe",root:0,c:0,child:0};
    for(const [request,reason] of [[{...q,root:1},"foreign-root"],[{...q,c:2},"outside-training"],[{...q,child:9},"outside-training"],[{...q,op:"write"},"unsupported"],[{...q,actor:0},"malformed"],[null,"malformed"]]){const before=port.remaining(),e=port.request(request);assert(e.decision==="REFUSE"&&e.reason===reason&&port.remaining()===before,"refusal "+reason);assert(!("bit" in e),"no disclosure")}
    for(let i=0;i<3;i++)assert(port.request(q).decision==="OBSERVE","valid");
    assert(port.request(q).reason==="budget"&&port.remaining()===0,"budget");
    for(const g of regimes)for(const b of budgets)for(const p of policies){
      const a=learn(root,b,g,p),v=learn(root,b,g,p);assert(JSON.stringify(a)===JSON.stringify(v),"deterministic receipt replay");assert(a.reads===(p==="blind"?0:b)&&a.net===3*a.correct-a.reads,"cost");assert(a.events.every((e,i)=>e.actor===0&&e.remaining===b-i-1&&cues.includes(e.c)),"receipt scope");assert(a.brier>=0&&a.brier<=2+1e-10,"brier bound");
    }
    const a=report(3);assert(JSON.stringify(a)===JSON.stringify(report(3)),"report replay");
    assert(a.rows.filter(x=>x.policy==="blind").every(x=>x.reads===0),"blind zero costs");
    return {checks,status:"passed"}
  }
  return {report,test};
}
const engine=experiment();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e2.mjs [test|report [seeds]]');
