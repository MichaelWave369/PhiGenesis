// ΦGenesis Absent Architect E2.2 — bounded belief revision and fresh audit.
function experiment(){
  const ids=Array.from({length:9},(_,i)=>i), train=[0,1,3], audit=[2,4], held=[5,6,7,8], regimes=["clean","stable-noisy","related-shift","unrelated-shift","scrambled"], policies=["frozen","retain","reset","mixture","abstain"], budgets=[3,6];
  const family=Array.from({length:36},(_,i)=>({r:Math.floor(i/9),b:i%9})), mod=x=>((x%3)+3)%3;
  const uniform=()=>Array(36).fill(1/36);
  function rng(seed){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)}}
  function transform(c,h){let x=c%3,y=Math.floor(c/3);for(let i=0;i<h.r;i++)[x,y]=[-y,x];return mod(x+h.b%3)+3*mod(y+Math.floor(h.b/3))}
  function oracle(c,h){const x=c%3,y=Math.floor(c/3),v=[[x,y],[-y,x],[-x,-y],[y,-x]][h.r];return mod(v[0]+h.b%3)+3*mod(v[1]+Math.floor(h.b/3))}
  function neighbors(h,k){return h!==k&&(h.r===k.r||h.b===k.b)}
  function unrelated(h,k){return h.r!==k.r&&h.b!==k.b}
  function fixture(seed){const r=rng(seed),noise=()=>({flip:r(10)===0,offset:1+r(8)});
    return ids.map(root=>{const h=family[r(36)],near=family.filter(k=>neighbors(h,k)),far=family.filter(k=>unrelated(h,k));return {root,h,near:near[r(near.length)],far:far[r(far.length)],scrambled:ids.map(()=>r(9)),oldNoise:Array.from({length:6},noise),freshNoise:Array.from({length:6},noise),auditNoise:Array.from({length:4},noise)}})}
  function truth(f,g,c,phase){if(phase==="old"||g==="clean"||g==="stable-noisy")return oracle(c,f.h);if(g==="related-shift")return oracle(c,f.near);if(g==="unrelated-shift")return oracle(c,f.far);return f.scrambled[c]}
  function sample(f,g,phase,i){const cues=phase==="audit"?audit:train,c=cues[i%cues.length],noise=f[phase+"Noise"][i],target=truth(f,g,c,phase);return {c,y:g!=="clean"&&noise.flip?(target+noise.offset)%9:target}}
  function update(w,s){const a=w.map((p,i)=>p*(transform(s.c,family[i])===s.y?.9:.0125)),z=a.reduce((x,y)=>x+y,0);if(!(z>0))throw Error("empty posterior");return a.map(x=>x/z)}
  function prior(w,p){if(p==="retain"||p==="frozen")return w.slice();if(p==="reset")return uniform();if(p==="mixture")return family.map((h,i)=>.5*w[i]+.25*w.reduce((s,v,j)=>s+(neighbors(h,family[j])?v/11:0),0)+.25/36);throw Error("unknown prior")}
  function argmax(w){return w.indexOf(Math.max(...w))}
  function run(f,g,p,b){
    if(!regimes.includes(g)||!policies.includes(p)||!budgets.includes(b))throw Error("invalid configuration");
    const events=[];let w=uniform(),old=0,fresh=0,verified=0,matches=0;
    function read(phase,i){const max=phase==="old"?6:phase==="fresh"?b:phase==="audit"?4:0;if(i<0||i>=max)throw Error("scope");const s=sample(f,g,phase,i);events.push({root:f.root,phase,...s});return s}
    if(p!=="abstain"){for(let i=0;i<6;i++){w=update(w,read("old",i));old++}w=prior(w,p);if(p!=="frozen")for(let i=0;i<b;i++){w=update(w,read("fresh",i));fresh++}}
    const h=family[argmax(w)],conf=Math.max(...w),eligible=p!=="abstain"&&conf>=.85;
    if(eligible)for(let i=0;i<4;i++){const s=read("audit",i);verified++;matches+=Number(transform(s.c,h)===s.y)}
    const accepted=eligible&&matches>=3;
    let correct=0,wrong=0,potential=0;for(const c of held){const ok=transform(c,h)===truth(f,g,c,"eval");potential+=Number(ok);if(accepted){if(ok)correct++;else wrong++}}
    const abstain=4-correct-wrong,utility=3*correct-2*wrong-.25*(old+fresh+verified);
    return {correct,wrong,abstain,potential,accepted:Number(accepted),eligible:Number(eligible),conf,old,fresh,verified,utility,events};
  }
  function report(seeds=90){
    if(!Number.isInteger(seeds)||seeds<1||seeds>900)throw Error("seed budget");
    const worlds=Array.from({length:seeds},(_,i)=>fixture(i+1)),rows=[];
    for(const g of regimes)for(const b of budgets)for(const p of policies){
      const s={correct:0,wrong:0,abstain:0,potential:0,accepted:0,eligible:0,conf:0,old:0,fresh:0,verified:0,utility:0};
      for(const world of worlds)for(const f of world){const v=run(f,g,p,b);for(const k of Object.keys(s))s[k]+=v[k]}
      const n=seeds*9;rows.push({regime:g,budget:b,policy:p,coverage:(s.correct+s.wrong)/(4*n),conditionalAccuracy:s.correct+s.wrong?s.correct/(s.correct+s.wrong):null,wrongRate:s.wrong/(4*n),ungatedAccuracy:s.potential/(4*n),meanReads:(s.old+s.fresh+s.verified)/n,utility:s.utility/n,incrementalUtility:(s.utility+.25*s.old)/n,confidence:s.conf/n});
    }
    return {schema:"absent-architect-e22-v1",status:"SIMULATED",authority:"NONE",seeds,rows};
  }
  function test(){let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++};
    for(const h of family){assert(family.filter(k=>neighbors(h,k)).length===11,"neighbor count");assert(family.filter(k=>unrelated(h,k)).length===24,"unrelated count");for(const c of ids)assert(transform(c,h)===oracle(c,h),"oracle agreement")}
    for(let i=0;i<36;i++){const w=family.map((_,j)=>Number(i===j));const a=prior(w,"mixture");assert(Math.abs(a.reduce((s,x)=>s+x,0)-1)<1e-12&&a.every(x=>x>0),"mixture normalized and full support");assert(a[i]>a[(i+1)%36],"old rule mass");assert(prior(w,"reset").every(x=>x===1/36),"reset")}
    for(const f of fixture(7)){assert(neighbors(f.h,f.near)&&unrelated(f.h,f.far),"shift classification");for(const g of regimes)for(const b of budgets){const a=run(f,g,"retain",b),z=run(f,g,"reset",b),m=run(f,g,"mixture",b);const training=v=>JSON.stringify(v.events.filter(e=>e.phase!=="audit"));assert(training(a)===training(z)&&training(z)===training(m),"matched old and fresh evidence");
      for(const p of policies){const v=run(f,g,p,b);assert(v.correct+v.wrong+v.abstain===4,"outcome accounting");assert(v.old===(p==="abstain"?0:6)&&v.fresh===((p==="abstain"||p==="frozen")?0:b),"read budget");assert(v.verified===(v.eligible?4:0)&&(!v.accepted||v.verified===4),"audit admission");assert(v.events.every(e=>e.root===f.root&&(e.phase==="audit"?audit:train).includes(e.c)),"scope");assert(v.utility===3*v.correct-2*v.wrong-.25*v.events.length,"utility");assert(JSON.stringify(v)===JSON.stringify(run(f,g,p,b)),"determinism");if(p==="abstain")assert(v.utility===0&&v.abstain===4,"zero baseline")}
    }}
    assert(JSON.stringify(report(3))===JSON.stringify(report(3)),"report replay");return {checks,status:"passed"};
  }
  return {report,test};
}
const engine=experiment();
const mode=process.argv[2]??'report';
if(mode==='test') console.log(JSON.stringify(engine.test(),null,2));
else if(mode==='report') console.log(JSON.stringify(engine.report(process.argv[3]===undefined?90:Number(process.argv[3])),null,2));
else throw Error('usage: node experiments/absent-architect-e22.mjs [test|report [seeds]]');
