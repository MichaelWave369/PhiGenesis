// ΦGenesis Absent Architect E2.1 — selective prediction and independent audit.
function experiment(){
  const ids=Array.from({length:9},(_,i)=>i), train=[0,1,3], audit=[2,4], held=[5,6,7,8], regimes=["clean","noisy","shifted","scrambled"], policies=["adaptive-verify","adaptive-unverified","adaptive-fixed-verify","balanced-fixed-verify","blind"];
  const family=Array.from({length:36},(_,i)=>({r:Math.floor(i/9),b:i%9})), mod=x=>((x%3)+3)%3;
  function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
  function shuffle(a,r){for(let i=a.length-1;i>0;i--){let j=r(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
  function transform(c,h){let x=c%3,y=Math.floor(c/3);for(let i=0;i<h.r;i++)[x,y]=[-y,x];return mod(x+h.b%3)+3*mod(y+Math.floor(h.b/3))}
  function oracle(c,h){const x=c%3,y=Math.floor(c/3),v=[[x,y],[-y,x],[-x,-y],[y,-x]][h.r];return mod(v[0]+h.b%3)+3*mod(v[1]+Math.floor(h.b/3))}
  const queries=train.flatMap(c=>ids.map(child=>({c,child})));
  function fixture(seed){const r=rng(seed);return ids.map(root=>{const i=r(36),shift=(i+1+r(35))%36;
    const permutations=train.map(()=>shuffle(ids.slice(),r));
    return {root,h:family[i],shift:family[shift],noiseTrain:Array.from({length:12},()=>r(10)===0),noiseAudit:Array.from({length:6},()=>r(10)===0),scrambled:ids.map(()=>r(9)),blind:held.map(()=>r(9)),fixed:ids.flatMap((_,j)=>train.map((c,k)=>({c,child:permutations[k][j]})))}
  })}
  function target(f,g,c,stage){return stage==="train"||g==="clean"||g==="noisy"?oracle(c,f.h):g==="shifted"?oracle(c,f.shift):f.scrambled[c]}
  function run(f,g,p){
    if(!regimes.includes(g)||!policies.includes(p))throw Error("unknown configuration");
    const events=[],w=Array(36).fill(1/36),used=new Set();
    let tr=0,au=0,remaining=18;
    function observe(stage,q){
      if(!remaining||!ids.includes(q.child)||(stage==="train"? !train.includes(q.c)||tr>=12:stage==="audit"? !audit.includes(q.c)||au>=6:true))throw Error("scope or budget");
      const i=stage==="train"?tr++:au++;
      const noise=g!=="clean"&&(stage==="train"?f.noiseTrain[i]:f.noiseAudit[i]);
      const bit=Number(target(f,g,q.c,stage)===q.child)^Number(noise);remaining--;
      events.push({stage,c:q.c,child:q.child,bit,remaining});return bit
    }
    const mass=q=>w.reduce((s,v,i)=>s+(transform(q.c,family[i])===q.child?v:0),0);
    const choose=()=>{let best=null,score=-1;for(const q of queries){if(used.has(q.c*9+q.child))continue;const a=mass(q),s=Math.min(a,1-a);if(s>score+1e-12){score=s;best=q}}return best};
    const confidence=()=>Math.max(...w);
    const early=p==="adaptive-verify"||p==="adaptive-unverified";
    if(p!=="blind")for(let t=0;t<12;t++){
      const q=p==="balanced-fixed-verify"?f.fixed[t]:choose();used.add(q.c*9+q.child);
      const bit=observe("train",q);for(let i=0;i<w.length;i++)w[i]*=Number(transform(q.c,family[i])===q.child)===bit?.9:.1;
      const sum=w.reduce((a,b)=>a+b,0);for(let i=0;i<w.length;i++)w[i]/=sum;
      if(early&&confidence()>=.95)break;
    }
    const conf=confidence(),h=family[w.indexOf(conf)],eligible=conf>=.9;
    let positives=0;
    const verify=p.endsWith("-verify");
    if(verify&&eligible)for(let i=0;i<6;i++){const c=audit[i%2];positives+=observe("audit",{c,child:transform(c,h)})}
    const accepted=p==="blind"||eligible&&(!verify||positives>=5);
    let correct=0,wrong=0,abstain=0,potentialCorrect=0;
    for(let j=0;j<held.length;j++){const c=held[j],prediction=p==="blind"?f.blind[j]:transform(c,h),ok=prediction===target(f,g,c,"eval");potentialCorrect+=Number(ok);if(!accepted)abstain++;else if(ok)correct++;else wrong++}
    return {correct,wrong,abstain,potentialCorrect,confidence:conf,eligible:Number(eligible),accepted:Number(accepted),auditRejected:Number(verify&&eligible&&positives<5),tr,au,net:3*correct-2*wrong-.25*(tr+au),events};
  }
  function report(seeds=90){
    if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed budget");
    const rows=[];for(const g of regimes)for(const p of policies){const s={correct:0,wrong:0,abstain:0,potentialCorrect:0,confidence:0,eligible:0,accepted:0,auditRejected:0,tr:0,au:0,net:0};for(let seed=1;seed<=seeds;seed++)for(const f of fixture(seed)) {const v=run(f,g,p);for(const k of Object.keys(s))s[k]+=v[k]}
      const n=seeds*9;rows.push({regime:g,policy:p,coverage:(s.correct+s.wrong)/(4*n),conditionalAccuracy:s.correct+s.wrong?s.correct/(s.correct+s.wrong):null,allCueAccuracy:s.correct/(4*n),ungatedAccuracy:s.potentialCorrect/(4*n),wrongRate:s.wrong/(4*n),...Object.fromEntries(["confidence","eligible","accepted","auditRejected","tr","au","net"].map(k=>[k,s[k]/n]))})}
    return {schema:"absent-architect-e21-v1",status:"SIMULATED",authority:"NONE",seeds,rows};
  }
  function test(){let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++};
    for(const h of family)for(const c of ids)assert(transform(c,h)===oracle(c,h),"oracle");
    for(const f of fixture(7)){assert(f.h!==f.shift,"distinct shift");assert(new Set(f.fixed.map(q=>q.c*9+q.child)).size===27,"balanced unique");
      for(const g of regimes){const a=run(f,g,"adaptive-verify"),b=run(f,g,"adaptive-unverified");assert(a.tr===b.tr&&a.potentialCorrect===b.potentialCorrect&&a.confidence===b.confidence,"matched preaudit");assert(a.accepted<=b.accepted,"verification cannot increase admission");
        for(const p of policies){const v=run(f,g,p);assert(v.correct+v.wrong+v.abstain===4,"outcome conservation");assert(v.tr+v.au<=18&&v.tr<=12&&v.au<=6,"read cap");assert(v.events.every((e,i)=>e.remaining===17-i&&(e.stage==="train"?train:audit).includes(e.c)),"scope ledger");assert(v.net===3*v.correct-2*v.wrong-.25*(v.tr+v.au),"utility");assert(JSON.stringify(v)===JSON.stringify(run(f,g,p)),"replay");if(p==="blind")assert(v.tr===0&&v.au===0&&v.accepted===1,"blind");if(p.includes("fixed"))assert(v.tr===12,"fixed charge");if(p.endsWith("-verify"))assert(!v.accepted||v.au===6,"verified admission")}
      }
    }
    assert(JSON.stringify(report(3))===JSON.stringify(report(3)),"report replay");return {checks,status:"passed"};
  }
  return {report,test};
}
const engine=experiment();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e21.mjs [test|report [seeds]]');
