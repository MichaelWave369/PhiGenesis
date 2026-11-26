"""Read-only, digest-approved PhiMemory9 evidence intake; no truth/authority promotion.

The pinned native constructor creates schema, so native read methods are bound to
SnapshotReader's read-only connection without invoking schema-creating constructors.
No HTTP service is created. Observation/expiry/availability overlays are explicitly
operator declarations, not native fields or independent authentication.
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

SCHEMA = "PhiGenesis.NativeMemoryIntake.v1"
MAX_BYTES = 8 * 1024 * 1024
LIMITS = {"blobs": 72, "memories": 72, "events": 900, "e_sources": 144,
          "e_claims": 144, "e_links": 288, "e_conflicts": 144, "e_log": 900}
OVERLAY = {"memoryId", "observedAt", "admitAfter", "expiresAt", "classification", "sourceState"}
HEX = re.compile(r"^[a-f0-9]{64}$")
MAX_STATEMENTS = 3000


class _ReadBudget:
    """Enforce counted native read statements BEFORE delegating execution."""
    def __init__(self, connection, measured, limit):
        self.connection, self.measured, self.limit = connection, measured, limit

    def execute(self, sql, *args):
        if self.measured["sqlStatements"] >= self.limit:
            raise ValueError("native SQL statement budget exhausted before execution")
        self.measured["sqlStatements"] += 1
        return self.connection.execute(sql, *args)

    def rollback(self):
        return self.connection.rollback()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def timestamp(value):
    if type(value) is not str or len(value) > 64:
        raise ValueError("bounded timestamp required")
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValueError("timestamp requires timezone")
    return result


def file_digest(path):
    if not path.is_file() or path.is_symlink() or path.stat().st_size > MAX_BYTES:
        raise ValueError("bounded regular source database required")
    for suffix in ("-wal", "-journal"):
        sidecar = Path(str(path) + suffix)
        if sidecar.exists() and sidecar.stat().st_size:
            raise ValueError("active WAL/journal source refused; select an offline snapshot")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_request(request):
    if type(request) is not dict or set(request) != {
            "databasePath", "databaseSha256", "query", "context", "asOf",
            "maxAgeSeconds", "limit", "observations"}:
        raise ValueError("exact memory intake fields required; no authority fields")
    if type(request["databasePath"]) is not str or not Path(request["databasePath"]).is_absolute():
        raise ValueError("explicit absolute source database required")
    if not isinstance(request["databaseSha256"], str) or not HEX.fullmatch(request["databaseSha256"]):
        raise ValueError("explicit reviewed database digest required")
    if type(request["query"]) is not str or not 1 <= len(request["query"]) <= 512:
        raise ValueError("bounded query required")
    if request["context"] is not None and (type(request["context"]) is not str or len(request["context"]) != 32):
        raise ValueError("native context identifier required")
    timestamp(request["asOf"])
    if type(request["maxAgeSeconds"]) is not int or not 1 <= request["maxAgeSeconds"] <= 31536000:
        raise ValueError("age bound")
    if type(request["limit"]) is not int or not 1 <= request["limit"] <= 72:
        raise ValueError("retrieval bound")
    observations = request["observations"]
    if type(observations) is not list or len(observations) > 72:
        raise ValueError("observation overlay bound")
    seen = set()
    for row in observations:
        if type(row) is not dict or set(row) != OVERLAY or type(row["memoryId"]) is not str or row["memoryId"] in seen:
            raise ValueError("exact unique observation declarations required")
        seen.add(row["memoryId"])
        if row["classification"] not in ("observed", "derived", "hypothesis", "missing"):
            raise ValueError("classification is an explicit declaration")
        if row["sourceState"] not in ("available", "unavailable", "revoked", "unknown"):
            raise ValueError("source state is an explicit declaration")
        for key in ("observedAt", "admitAfter", "expiresAt"):
            if row[key] is not None:
                timestamp(row[key])
        if row["observedAt"] and row["admitAfter"] and timestamp(row["admitAfter"]) < timestamp(row["observedAt"]):
            raise ValueError("admission cannot precede declared observation")
    return request


def intake(request, *, statement_limit=MAX_STATEMENTS):
    from phimemory9.core import MemoryEngine
    from phimemory9.evidence import EvidenceLedger
    from phimemory9.local_lab import SnapshotReader
    from phimemory9.retrieval import search

    validate_request(request)
    if type(statement_limit) is not int or not 1 <= statement_limit <= MAX_STATEMENTS:
        raise ValueError("native statement ceiling cannot be increased")
    path = Path(request["databasePath"])
    if path.resolve() != path or file_digest(path) != request["databaseSha256"]:
        raise ValueError("source database digest/path drift")
    reader = SnapshotReader(path)
    measured = {"sqlStatements": 0, "nativeRecords": 0, "provenanceEdges": 0,
                "sourceBytes": path.stat().st_size * 2}
    now = timestamp(request["asOf"])
    declarations = {r["memoryId"]: r for r in request["observations"]}
    with reader._connection() as raw_db:
        db = _ReadBudget(raw_db, measured, statement_limit)
        db.execute("BEGIN")
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        evidence_tables = {t for t in LIMITS if t.startswith("e_")}
        if tables.intersection(evidence_tables) not in (set(), evidence_tables):
            raise ValueError("partial native evidence schema refused")
        for table, maximum in LIMITS.items():
            if table in tables and db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] > maximum:
                raise ValueError("native capacity saturation: " + table)
        # These read methods require only .db; the native initialization DDL is
        # intentionally bypassed. SnapshotReader already checked persisted schema.
        engine = object.__new__(MemoryEngine)
        engine.db = db
        if not engine.verify()["ok"]:
            raise ValueError("native memory integrity refused")
        ledger = None
        if evidence_tables <= tables:
            ledger = object.__new__(EvidenceLedger)
            ledger.db, ledger.memory = db, engine
            if not ledger.audit()["ok"]:
                raise ValueError("native evidence integrity refused")
        memories = [dict(r) for r in db.execute("SELECT * FROM memories ORDER BY id")]
        expected_columns = {"id", "blob_id", "content", "fingerprint", "source_ref", "parent_memory_id", "status", "created_at"}
        if any(set(r) != expected_columns for r in memories):
            raise ValueError("unknown native memory columns; authority metadata is not imported")
        identities = {r["id"] for r in memories}
        if set(declarations) - identities:
            raise ValueError("overlay references unknown memory")
        blobs = {r[0] for r in db.execute("SELECT id FROM blobs")}
        if request["context"] is not None and request["context"] not in blobs:
            raise ValueError("unknown native context")
        refs = []
        all_claims, all_links, all_sources, all_conflicts = {}, {}, {}, {}
        for record in memories:
            mid = record["id"]
            lineage = engine.lineage(mid)
            events = engine.events(mid)
            claims = [dict(r) for r in db.execute("SELECT * FROM e_claims WHERE memory_id=? ORDER BY id", (mid,))] if ledger else []
            source_ids, conflicts, links = set(), set(), []
            challenged = False
            for claim in claims:
                exported = ledger.export(claim["id"])
                all_claims[claim["id"]] = {k: claim[k] for k in ("id", "memory_id", "row_hash", "created_at")}
                for source in exported["sources"]:
                    source_ids.add(source["id"])
                    all_sources[source["id"]] = {k: source[k] for k in
                        ("id", "label", "locator", "kind", "independence_group", "declared_sha256", "row_hash", "created_at")}
                for link in exported["evidence_links"]:
                    all_links[link["id"]] = {k: link[k] for k in ("id", "claim_id", "source_id", "stance", "row_hash", "created_at")}
                    links.append(link["id"])
                    challenged |= link["stance"] == "challenge"
                for conflict in exported["contradictions"]:
                    conflicts.add(conflict["id"])
                    all_conflicts[conflict["id"]] = {k: conflict[k] for k in
                        ("id", "left_claim", "right_claim", "row_hash", "created_at")}
            overlay = declarations.get(mid, {})
            observed = overlay.get("observedAt")
            reasons = []
            if record["status"] != "active":
                reasons.append("SUPERSEDED" if any(e["stage"] == "RENEW" for e in events) else "RETIRED")
            if request["context"] is not None and record["blob_id"] != request["context"]:
                reasons.append("CONTEXT_MISMATCH")
            if not record["source_ref"] and not source_ids:
                reasons.append("MISSING_SOURCE")
            if challenged or conflicts:
                reasons.append("CONTRADICTORY")
            if overlay.get("sourceState", "unknown") != "available":
                reasons.append("SOURCE_" + overlay.get("sourceState", "unknown").upper())
            if timestamp(record["created_at"]) > now:
                reasons.append("NOT_YET_ADMITTED")
            if overlay.get("admitAfter") and timestamp(overlay["admitAfter"]) > now:
                reasons.append("DELAYED_ADMISSION")
            if observed is None:
                reasons.append("UNKNOWN_OBSERVATION_TIME")
            elif timestamp(observed) > now:
                reasons.append("FUTURE_OBSERVATION")
            elif (now - timestamp(observed)).total_seconds() > request["maxAgeSeconds"]:
                reasons.append("STALE")
            if overlay.get("expiresAt") and timestamp(overlay["expiresAt"]) <= now:
                reasons.append("EXPIRED")
            if overlay.get("classification") == "missing":
                reasons.append("DECLARED_MISSING")
            refs.append({"nativeId": mid, "nativeContext": record["blob_id"],
                "parentId": record["parent_memory_id"], "lineage": lineage,
                "sourceRef": record["source_ref"], "sourceIds": sorted(source_ids),
                "contentDigest": record["fingerprint"], "recordDigest": digest(record),
                "revision": {"kind": "latest_native_event_id", "value": max((e["id"] for e in events), default=None)},
                "observedAt": observed, "admittedAt": record["created_at"],
                "temporalDeclaration": overlay or None, "classification": overlay.get("classification", "unreviewed"),
                "classificationOrigin": "operator_declaration" if overlay else "unreviewed",
                "lifecycle": record["status"], "conflictIds": sorted(conflicts), "linkIds": sorted(set(links)),
                "events": [{"id": e["id"], "stage": e["stage"], "recordedAt": e["recorded_at"],
                            "detailDigest": hashlib.sha256(e["detail_json"].encode()).hexdigest()} for e in events],
                "eligible": not reasons, "holds": sorted(reasons), "authority": "NONE"})
        candidates = {r["nativeId"] for r in refs if r["eligible"]}
        # Request the whole bounded native candidate pool before admissibility
        # filtering. Filtering only a top-k prefix could conceal admissible rows.
        rankings = {}
        for method in ("lexical", "ancestry"):
            ranked = search(engine, request["query"], method=method, k=100)
            rankings[method] = [{"nativeId": r["id"], "score": r["score"],
                                 "directScore": r["direct_score"], "ancestryBonus": r["ancestry_bonus"]}
                                for r in ranked if r["id"] in candidates][:request["limit"]]
        fingerprint_groups = {}
        for record in memories:
            fingerprint_groups.setdefault(record["fingerprint"], []).append(record["id"])
        duplicate_groups = sorted(sorted(ids) for ids in fingerprint_groups.values() if len(ids) > 1)
        measured["nativeRecords"] = len(refs) + len(all_claims) + len(all_sources) + len(all_links) + len(all_conflicts)
        measured["provenanceEdges"] = sum(len(r["lineage"]) - 1 for r in refs) + len(all_links) + len(all_conflicts)
        artifact = {"schema": SCHEMA, "authority": "NONE", "actionAuthority": False, "executionAuthority": False,
            "databaseDigest": request["databaseSha256"], "requestDigest": digest(request),
            "asOf": request["asOf"], "context": request["context"], "references": refs,
            "claims": sorted(all_claims.values(), key=lambda r: r["id"]),
            "sources": sorted(all_sources.values(), key=lambda r: r["id"]),
            "links": sorted(all_links.values(), key=lambda r: r["id"]),
            "conflicts": sorted(all_conflicts.values(), key=lambda r: r["id"]),
            "duplicateGroups": duplicate_groups, "rankings": rankings,
            "uncertainty": "Native hashes establish consistency, not observation truth. Timing and availability overlays are operator declarations.",
            "counts": {"memories": len(refs), "eligible": len(candidates), "held": len(refs) - len(candidates)}}
        db.rollback()
    if file_digest(path) != request["databaseSha256"]:
        raise ValueError("source database changed during read")
    return {"artifact": artifact, "measured": measured}
