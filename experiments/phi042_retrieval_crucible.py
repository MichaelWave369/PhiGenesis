"""Internal research crucible; no production retrieval changes or authority."""
import hashlib
import json
import math
from collections import Counter
from phimemory9.core import MemoryEngine
from phimemory9.retrieval import tokens
from phimemory9 import benchmark_r05 as native

PIN = "5cba675a3a439023a3ff374c238dd6e4339e3a55"
SUPPLEMENTAL = json.loads("{\"history\":[[\"Atlas pump zircon bearing seized\",\"Repair note A17 completed\",\"atlas pump zircon bearing\"],[\"Boreal relay cobalt contact cracked\",\"Service note B28 archived\",\"boreal relay cobalt contact\"],[\"Cinder motor nickel shaft warped\",\"Maintenance note C39 closed\",\"cinder motor nickel shaft\"],[\"Delta valve quartz seal fractured\",\"Work note D40 resolved\",\"delta valve quartz seal\"],[\"Ember sensor copper probe failed\",\"Inspection note E51 complete\",\"ember sensor copper probe\"],[\"Fjord turbine silver rotor stalled\",\"Repair note F62 filed\",\"fjord turbine silver rotor\"]],\"current\":[[\"Grove compressor titanium piston cycles\",\"grove compressor titanium piston\"],[\"Haven antenna brass feed operates\",\"haven antenna brass feed\"],[\"Ion battery lithium cell charges\",\"ion battery lithium cell\"],[\"Jade filter carbon cartridge cleans\",\"jade filter carbon cartridge\"],[\"Kestrel scanner sapphire lens tracks\",\"kestrel scanner sapphire lens\"],[\"Lumen heater tungsten coil warms\",\"lumen heater tungsten coil\"]],\"negative\":[\"atlas pump teleport dragon\",\"boreal relay cobalt unicorn\",\"cinder motor nickel prophecy\",\"delta valve quartz immortality\",\"ember sensor copper levitation\",\"fjord turbine silver dream\",\"atlas pump boreal relay\",\"cinder motor delta valve\",\"ember sensor fjord turbine\",\"grove compressor haven antenna\",\"ion battery jade filter\",\"kestrel scanner lumen heater\"]}")
METHODS = (*native.METHODS, "full_norm", "agreement")

def full_norm_rank(engine, question):
    # Same active corpus, six-hop union and IDF as the pinned native method.
    # Include unseen query terms in the norm at smoothed zero-DF IDF.
    rows = [dict(r) for r in engine.db.execute(
        "SELECT id,content,parent_memory_id FROM memories WHERE status='active'")]
    documents = []
    for row in rows:
        words = set(tokens(row["content"]))
        cursor, visited = row["parent_memory_id"], {row["id"]}
        for _ in range(native.MAX_HISTORY_HOPS):
            if cursor is None: break
            if cursor in visited: raise ValueError("ancestry cycle")
            visited.add(cursor)
            parent = engine.memory(cursor)
            words.update(tokens(parent["content"]))
            cursor = parent["parent_memory_id"]
        documents.append(words)
    df = Counter(w for words in documents for w in words)
    def idf(w): return math.log((len(rows)+1)/(df[w]+1))+1
    q = sorted(tokens(question))
    qnorm = math.sqrt(math.fsum(idf(w)**2 for w in q))
    result = []
    for row, words in zip(rows, documents):
        norm = math.sqrt(math.fsum(idf(w)**2 for w in sorted(words)))
        score = math.fsum(idf(w)**2 for w in q if w in words)/(qnorm*norm) if qnorm and norm else 0.0
        if score >= native.THRESHOLDS["sparse_history"]:
            result.append({"id":row["id"],"content":row["content"],"score":score})
    return sorted(result,key=lambda r:(-r["score"],r["content"],r["id"]))[:3]

def evaluate(history,current,negative):
    with MemoryEngine() as engine:
        blob = engine.create_blob("internal crucible")
        queries=[]
        for old,new,q in history:
            ident=engine.renew(engine.enter(blob,old),new,"Synthetic update")
            queries.append(("history",q,ident))
        for doc,q in current:
            queries.append(("current",q,engine.enter(blob,doc)))
        queries += [("negative",q,None) for q in negative]
        details=[]
        for group,q,ident in queries:
            ranked={m:native._rank(engine,q,m) for m in native.METHODS}
            ranked["full_norm"]=full_norm_rank(engine,q)
            # Same frozen gates and top-three outputs; no fallback or reranking.
            ids={x["id"] for x in ranked["ancestry"]}
            ranked["agreement"]=[x for x in ranked["sparse_history"] if x["id"] in ids]
            row={}
            for m,items in ranked.items():
                rank=next((i+1 for i,x in enumerate(items) if x["id"]==ident),None) if ident else None
                row[m]={"rank":rank,"abstained":not items}
            details.append({"group":group,"query":q,"results":row})
        summary={}
        for m in METHODS:
            summary[m]={}
            for group in ("history","current","negative"):
                subset=[r["results"][m] for r in details if r["group"]==group]
                summary[m][group]={"queries":len(subset),"abstained":sum(r["abstained"] for r in subset),
                    **({"false_accept":sum(not r["abstained"] for r in subset)} if group=="negative"
                       else {"hit1":sum(r["rank"]==1 for r in subset),"hit3":sum(r["rank"] is not None for r in subset)})}
        assert full_norm_rank(engine,"zzzzunknown qqqqmissing")==[]
        assert full_norm_rank(engine,"")==[]
        assert full_norm_rank(engine,current[0][0])[0]["content"]==current[0][0]
        return {"summary":summary,"queries":details}

def main():
    r05=evaluate(native.HISTORY_CASES,native.CURRENT_CASES,native.NEGATIVES)
    original=native.run_heldout_r05()
    for row, prior in zip(r05["queries"],original["queries"],strict=True):
        for m in native.METHODS:
            assert row["results"][m]=={k:prior["results"][m][k] for k in ("rank","abstained")}
    stress=evaluate(SUPPLEMENTAL["history"],SUPPLEMENTAL["current"],SUPPLEMENTAL["negative"])
    manifest={"pin":PIN,"r05Manifest":original["manifest_sha256"],"supplemental":SUPPLEMENTAL,
              "thresholds":native.THRESHOLDS,"newMethods":["full_norm","agreement"]}
    return {"schema":"phi042-internal-retrieval-crucible-v1","authority":"NONE","release":"BLOCKED",
            "manifest":manifest,"manifestSha256":hashlib.sha256(json.dumps(manifest,sort_keys=True,separators=(",",":")).encode()).hexdigest(),
            "r05":r05,"supplemental":stress}

if __name__=="__main__":
    print(json.dumps(main(),sort_keys=True,separators=(",",":")))
