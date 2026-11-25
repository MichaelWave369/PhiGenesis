// Genesis Field v0.3 — bounded, verified collaboration experiment.
const TERMS=[1,2,3,4,5,6,8,9,10,12,16,17,18,20,24], TRAIN=[0,1,2,3,4,5,6,8,9,10,12,16,17,18,20,24], AUDIT=[7,11,13,14,15,19,21,22,23,25,26,27,28], TEST=[29,30,31];
function pop(x){let n=0;while(x){n+=x&1;x>>>=1;}return n;}

function rule(bias,terms){return {bias,terms:[...terms].sort((a,b)=>a-b)};}

function validRule(r){return !!r&&Object.keys(r).sort().join(",")==="bias,terms"&&(r.bias===0||r.bias===1)&&Array.isArray(r.terms)&&r.terms.length<=2&&r.terms.every((x,i)=>TERMS.includes(x)&&(!i||x>r.terms[i-1]));}

function evaluate(r,x){return r.terms.reduce((y,t)=>y^Number((x&t)===t),r.bias);}

function oracle(r,x){return (r.bias+r.terms.reduce((y,t)=>y+Array.from({length:5},(_,i)=>i).filter(i=>Math.floor(t/2**i)%2).reduce((p,i)=>p*(Math.floor(x/2**i)%2),1),0))%2;}

function candidates(terms){const a=[[]];for(let i=0;i<terms.length;i++){a.push([terms[i]]);for(let j=i+1;j<terms.length;j++)a.push([terms[i],terms[j]]);}return a.flatMap(t=>[0,1].map(b=>rule(b,t)));}

function instance(id){return {id,library:[],history:[]};}

function remember(s,r,entry){s.history.push({...entry,rule:rule(r.bias,r.terms)});s.library=[...new Set([...s.library,...r.terms])].sort((a,b)=>a-b);}

function learn(s,world,observe,{useMemory=true,budget=48}={}){
 if(!Number.isInteger(budget)||budget<1||budget>48)throw Error("budget");
 let live=candidates(useMemory&&s.library.length?s.library:TERMS),restricted=useMemory&&s.library.length>0,used=0,fallback=false,seen=[];
 const query=x=>{if(used>=budget)return null;used++;const y=observe(x);if(y!==0&&y!==1)throw Error("invalid observation");return y;};
 const expand=()=>{restricted=false;fallback=true;live=candidates(TERMS).filter(r=>seen.every(([x,y])=>evaluate(r,x)===y));};
 while(used<budget){
  if(!live.length){if(restricted){expand();continue;}break;}
  if(live.length===1){
   const r=live[0];let pass=true;
   for(const x of AUDIT){const y=query(x);if(y===null){pass=false;break;}if(evaluate(r,x)!==y){pass=false;break;}}
   if(pass){remember(s,r,{kind:"local",world,queries:used});return {status:"accepted",rule:r,used,fallback};}
   if(restricted){expand();continue;}break;
  }
  let best=-1,score=0;
  for(const x of TRAIN){if(seen.some(([z])=>z===x))continue;const n=live.reduce((a,r)=>a+evaluate(r,x),0),v=Math.min(n,live.length-n);if(v>score){best=x;score=v;}}
  if(best<0)break;
  const y=query(best);if(y===null)break;seen.push([best,y]);live=live.filter(r=>evaluate(r,best)===y);
 }
 s.history.push({kind:"abstain",world,queries:used});return {status:"abstained",rule:null,used,fallback};
}

function permutation(p){return Array.isArray(p)&&p.length===5&&new Set(p).size===5&&p.every(x=>Number.isInteger(x)&&x>=0&&x<5);}

function mapMask(x,p){let out=0;for(let i=0;i<5;i++)if(x&(1<<i))out|=1<<p[i];return out;}

function invert(p){return Array.from({length:5},(_,i)=>p.indexOf(i));}

function translate(r,p){if(!validRule(r)||!permutation(p))throw Error("invalid translation");return rule(r.bias,r.terms.map(x=>mapMask(x,p)));}

function calibrate(pairs){
 if(!Array.isArray(pairs)||pairs.length!==5)throw Error("five anchors required");
 const p=Array(5).fill(-1);
 for(const pair of pairs){if(!Array.isArray(pair)||pair.length!==2||pair.some(x=>!Number.isInteger(x)||x<1||x>16||pop(x)!==1))throw Error("invalid anchor");const [a,b]=pair.map(Math.log2);if(p[a]!==-1)throw Error("duplicate anchor");p[a]=b;}
 if(!permutation(p))throw Error("nonbijective anchors");return p;
}

function packet(sender,world,r){if(!["A","B"].includes(sender)||!/^w[0-9]{1,8}$/.test(world)||!validRule(r))throw Error("invalid packet");return JSON.stringify({schema:3,sender,world,rule:r});}

function receive(s,raw,pairs,observe,expectedSender,expectedWorld){
 let p,r;
 try{if(typeof raw!=="string"||raw.length>512)throw Error("size");p=JSON.parse(raw);if(p.schema!==3||p.sender!==expectedSender||p.world!==expectedWorld||packet(p.sender,p.world,p.rule)!==raw)throw Error("packet");r=translate(p.rule,calibrate(pairs));}
 catch{return {status:"malformed",used:0};}
 let used=0;
 for(const x of AUDIT){const y=observe(x);used++;if(y!==0&&y!==1)throw Error("invalid observation");if(y!==evaluate(r,x)){s.history.push({kind:"rejected",sender:p.sender,world:p.world,queries:used});return {status:"rejected",used};}}
 remember(s,r,{kind:"peer",sender:p.sender,world:p.world,queries:used});return {status:"accepted",used,rule:r};
}

function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};}

function shuffle(arr,next){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=next()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

function anchors(from,to){return Array.from({length:5},(_,i)=>[mapMask(1<<i,from),mapMask(1<<i,to)]);}

function localOracle(global,perm){const inv=invert(perm);return x=>oracle(global,mapMask(x,inv));}

function trial(seed){
 const next=rng((0x8f341abc+seed)>>>0),pa=shuffle([0,1,2,3,4],next),pb=shuffle([0,1,2,3,4],next),pc=shuffle([0,1,2,3,4],next);
 const [a,b,c,d,e]=shuffle(TERMS.filter(x=>pop(x)===2),next);
 const sourceA=rule(next()&1,[a,b]),sourceB=rule(next()&1,[c,d]);
 const A=instance("A"),B=instance("B"),C=instance("C"),solo=instance("C-solo");
 const la=learn(A,"w1",localOracle(sourceA,pa)),lb=learn(B,"w2",localOracle(sourceB,pb));
 if(la.status!=="accepted"||lb.status!=="accepted")throw Error("source");
 const ma=packet("A","w1",la.rule),mb=packet("B","w2",lb.rule),aa=anchors(pa,pc),ab=anchors(pb,pc);
 const va=receive(C,ma,aa,localOracle(sourceA,pc),"A","w1"),vb=receive(C,mb,ab,localOracle(sourceB,pc),"B","w2");
 const corrupt=packet("A","w1",rule(la.rule.bias^1,la.rule.terms)),bad=instance("bad");
 const rejected=receive(bad,corrupt,aa,localOracle(sourceA,pc),"A","w1");
 const wrongMap=aa.map(([x,y])=>[x,mapMask(y,[1,0,2,3,4])]);
 const mapControl=receive(instance("map-control"),ma,wrongMap,localOracle(sourceA,pc),"A","w1");
 const unaligned=receive(instance("unaligned"),ma,anchors(pc,pc),localOracle(sourceA,pc),"A","w1");
 const pairs=[[a,c],[a,d],[b,c],[b,d],[a,c],[b,d],[a,e]];
 const rows=pairs.map((t,i)=>{
   const g=rule(next()&1,t),obs=localOracle(g,pc),world="w"+(i+3);
   const collab=learn(C,world,obs),alone=learn(solo,world,obs),cold=learn(instance("cold"),world,obs,{useMemory:false});
   const score=r=>r.status==="accepted"?TEST.filter(x=>evaluate(r.rule,x)===obs(x)).length:0;
   const exact=r=>r.status==="accepted"&&JSON.stringify(r.rule)===JSON.stringify(translate(g,pc));
   return {collab:collab.used,solo:alone.used,cold:cold.used,collabExact:exact(collab),soloExact:exact(alone),coldExact:exact(cold),collabCorrect:score(collab),soloCorrect:score(alone),coldCorrect:score(cold),fallback:collab.fallback};
 });
 const total=(k,rs=rows)=>rs.reduce((x,r)=>x+Number(r[k]),0);
 // Wire bytes: canonical ASCII packet text plus JSON anchor arrays. No transport headers.
 return {seed,sourceQueries:la.used+lb.used,anchorPairs:10,anchorEndpointObservations:20,peerAuditQueries:va.used+vb.used,wireBytes:ma.length+mb.length+JSON.stringify(aa).length+JSON.stringify(ab).length,peerAccepted:Number(va.status==="accepted")+Number(vb.status==="accepted"),corruptionRejected:rejected.status==="rejected"&&bad.library.length===0,wrongMapRejected:mapControl.status==="rejected",unalignedRejected:unaligned.status==="rejected",collab:total("collab"),solo:total("solo"),cold:total("cold"),familiarCollab:total("collab",rows.slice(0,6)),familiarSolo:total("solo",rows.slice(0,6)),familiarCold:total("cold",rows.slice(0,6)),collabExact:total("collabExact"),soloExact:total("soloExact"),coldExact:total("coldExact"),collabCorrect:total("collabCorrect"),soloCorrect:total("soloCorrect"),coldCorrect:total("coldCorrect"),novelFallback:rows[6].fallback,rows};
}

function report(seeds=90){
 if(!Number.isInteger(seeds)||seeds<1||seeds>1000)throw Error("seed limit");
 const rows=Array.from({length:seeds},(_,i)=>trial(i)),sum=k=>rows.reduce((a,r)=>a+Number(r[k]),0);
 const means=Object.fromEntries(["sourceQueries","anchorPairs","anchorEndpointObservations","peerAuditQueries","wireBytes","collab","solo","cold","familiarCollab","familiarSolo","familiarCold"].map(k=>[k,sum(k)/seeds]));
 return {seeds,targetsPerSeed:7,testCases:seeds*7*TEST.length,peerAccepted:sum("peerAccepted"),corruptionRejected:sum("corruptionRejected"),wrongMapRejected:sum("wrongMapRejected"),unalignedRejected:sum("unalignedRejected"),collabExact:sum("collabExact"),soloExact:sum("soloExact"),coldExact:sum("coldExact"),collabCorrect:sum("collabCorrect"),soloCorrect:sum("soloCorrect"),coldCorrect:sum("coldCorrect"),novelFallbacks:sum("novelFallback"),means,fullyChargedMean:means.sourceQueries+means.anchorEndpointObservations+means.peerAuditQueries+means.collab,incrementalMean:means.anchorEndpointObservations+means.peerAuditQueries+means.collab,rows};
}

function checks(){
 const out=[];function test(n,f){f();out.push(n);}function assert(x,m){if(!x)throw Error(m);}
 test("disjoint partitions and unique audit",()=>{assert(new Set([...TRAIN,...AUDIT,...TEST]).size===32,"partition");assert(new Set(candidates(TERMS).map(r=>AUDIT.map(x=>evaluate(r,x)).join(""))).size===242,"audit");});
 test("coordinate equivariance all 242 rules",()=>{const p=[4,2,0,1,3];for(const r of candidates(TERMS))for(let x=0;x<32;x++)assert(evaluate(translate(r,p),mapMask(x,p))===oracle(r,x),"translate");});
 test("calibration and nonbijection rejection",()=>{const a=[2,0,1,4,3],b=[4,1,0,2,3],p=calibrate(anchors(a,b));for(let x=0;x<32;x++)assert(mapMask(mapMask(x,a),p)===mapMask(x,b),"anchor");let fail=false;try{calibrate([[1,1],[2,1],[4,4],[8,8],[16,16]]);}catch{fail=true;}assert(fail,"nonbijection");});
 test("strict malformed packet and wrong source",()=>{const s=instance("C");assert(receive(s,"{}",[],()=>0,"A","w1").status==="malformed","bad");assert(receive(s,packet("B","w1",rule(0,[3])),anchors([0,1,2,3,4],[0,1,2,3,4]),()=>0,"A","w1").status==="malformed"&&s.history.length===0,"source");});
 test("exhaustive wrong-rule rejection",()=>{const all=candidates(TERMS),p=[0,1,2,3,4],a=anchors(p,p),truth=rule(0,[3,5]);for(const r of all){const s=instance("C"),v=receive(s,packet("A","w1",r),a,x=>oracle(truth,x),"A","w1");assert((v.status==="accepted")===(JSON.stringify(r)===JSON.stringify(truth)),"audit");}});
 test("independent memories and budget",()=>{const a=instance("A"),b=instance("B");learn(a,"w1",x=>oracle(rule(0,[3]),x));assert(!b.library.length,"alias");assert(learn(b,"w2",x=>x&1,{budget:1}).status==="abstained","budget");});
 test("benchmark correctness and reproducibility",()=>{const r=report(90);assert(r.peerAccepted===180&&r.corruptionRejected===90&&r.collabExact===630&&r.soloExact===630&&r.coldExact===630&&r.novelFallbacks===90,"benchmark");assert(JSON.stringify(r)===JSON.stringify(report(90)),"replay");});
 return out;
}
export {instance,learn,packet,receive,calibrate,translate,report,checks};
