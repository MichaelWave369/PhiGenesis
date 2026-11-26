// Fixed offline adapters. No model, arbitrary code, tools, or worker dispatch.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {run,restore} from '../../experiments/phi030-memory.mjs';
import {retrieve,verifyReport} from '../../experiments/phi031-altermath-bridge.mjs';
import {packet} from '../../experiments/phi032-packet.mjs';
import {hash, must, zero, artifactCheck} from './protocol.mjs';

const request=JSON.parse(readFileSync(0,'utf8'));
const {stage,input,roots}=request;
const measured=zero(); measured.workerCalls=1;
const output=value=>process.stdout.write(JSON.stringify({artifact:artifactCheck(stage,value),measured}));
const meteredSnapshot=s=>{
  measured.fixtureRows+=s.next*54; // 18 acquisition + 36 evaluation fixtures per epoch.
  measured.comparisons+=s.events.reduce((n,e)=>n+e.comparisons,0);
  return s;
};
if (stage === 'memory') {
  const snapshot=meteredSnapshot(run(7,'delayed','context-tagged',24));
  output({schema:'cycle3-memory/v1',authority:'NONE',snapshot});
} else {
  must(['retrieve','verify'].includes(stage),'unsupported adapter');
  artifactCheck(stage === 'retrieve' ? 'memory' : 'retrieve',input);
  const alt=await import(pathToFileURL(join(roots.Altermath,'src/causal-belt.mjs')).href);
  must(alt.CAUSAL_VERSION === 'Altermath.CausalBelt.R1','interpreter version');
  const env={
    restore:s=>meteredSnapshot(restore(s)),
    runCausalScore:request=>{
      const result=alt.runCausalScore(request);
      measured.interpreterFuel+=result.fuelConsumed;
      return result;
    },
    verifyCausalReceipts:receipts=>{
      measured.receiptChecks+=receipts.length;
      return alt.verifyCausalReceipts(receipts);
    },
  };
  const query={context:0,x:4,y:5,tag:1};
  if (stage === 'retrieve') {
    const report=retrieve(input.snapshot,query,env);
    // Translate examines each eligible retained row once for distance and again
    // for nearest membership. Meter distance evaluations, not CPU instructions.
    measured.comparisons+=report.evidence.eligible*2;
    output({schema:'cycle3-retrieve/v1',authority:'NONE',snapshot:input.snapshot,report,packet:packet(report,hash)});
  } else {
    must(verifyReport(input.snapshot,query,input.report,env),'retrieval replay mismatch');
    measured.comparisons+=input.report.evidence.eligible*2;
    must(hash(packet(input.report,hash)) === hash(input.packet),'packet substitution');
    output({schema:'cycle3-verify/v1',authority:'NONE',packet:input.packet});
  }
}
