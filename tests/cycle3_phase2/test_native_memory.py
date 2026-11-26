import copy
from contextlib import closing
import hashlib
import importlib.util
import json
import os
import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NATIVE = Path(os.environ.get("PHIGENESIS_PHASE2_NATIVE_ROOT", str(ROOT.parent / "PhiMemory9")))
sys.path[:0] = [str(ROOT / "runtime/cycle3"), str(NATIVE / "src")]
from native_memory import intake, file_digest, validate_request
from phimemory9.core import MemoryEngine, MemoryError9
from phimemory9.evidence import EvidenceLedger


def fixture(path):
    with MemoryEngine(path) as memory:
        a, b = memory.create_blob("fixture:context-a"), memory.create_blob("fixture:context-b")
        current = memory.enter(a, "Tower pressure sensor calibration", "fixture:observation")
        old = memory.enter(a, "Fiber connector dust interruption", "fixture:maintenance")
        renewed = memory.renew(old, "Closed maintenance ticket FX-9", "fixture:renewal")
        missing = memory.enter(a, "Unknown pressure observation")
        contested = memory.enter(a, "Tower pressure is elevated", "fixture:instrument-a")
        opposite = memory.enter(b, "Tower pressure is low", "fixture:instrument-b")
        duplicate = memory.enter(b, "Tower pressure sensor calibration", "fixture:duplicate-observation")
        evidence = EvidenceLedger(memory)
        s1 = evidence.source("fixture:instrument-a", "fixture:s1", kind="observation")
        s2 = evidence.source("fixture:instrument-b", "fixture:s2", kind="observation")
        c1 = evidence.claim(contested, "fixture:claim-high")
        c2 = evidence.claim(opposite, "fixture:claim-low")
        evidence.attach(c1, s1, "support")
        evidence.attach(c1, s2, "challenge")
        evidence.attach(c2, s2, "support")
        evidence.contradiction(c1, c2, "fixture:incompatible instrument claims")
        ids = dict(current=current, old=old, renewed=renewed, missing=missing,
                   contested=contested, opposite=opposite, duplicate=duplicate)
        stamp = datetime.now(timezone.utc)
        observed = (stamp - timedelta(seconds=30)).isoformat()
        req = dict(databasePath=str(path), databaseSha256="0"*64, query="Tower pressure sensor",
                   context=a, asOf=(stamp + timedelta(seconds=30)).isoformat(), maxAgeSeconds=3600, limit=9,
                   observations=[dict(memoryId=mid, observedAt=observed, admitAfter=None, expiresAt=None,
                                      classification="observed", sourceState="available") for mid in ids.values()])
    req["databaseSha256"] = file_digest(path)
    return req, ids, (a, b)


class NativeMemoryTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        # Windows runner TEMP can contain 8.3 aliases (e.g. RUNNER~1).
        # Approve the actual canonical path, as the runtime requires.
        self.path = Path(self.folder.name).resolve(strict=True) / "native.sqlite3"
        self.request, self.ids, self.contexts = fixture(self.path)

    def tearDown(self):
        self.folder.cleanup()

    def rows(self, request=None):
        result = intake(request or self.request)
        return result, {r["nativeId"]: r for r in result["artifact"]["references"]}

    def overlay(self, req, mid):
        return next(r for r in req["observations"] if r["memoryId"] == mid)

    def test_native_read_is_content_private_and_source_bytes_unchanged(self):
        before = self.path.read_bytes()
        result, rows = self.rows()
        self.assertEqual(before, self.path.read_bytes())
        self.assertTrue(rows[self.ids["current"]]["eligible"])
        self.assertEqual(result["artifact"]["authority"], "NONE")
        self.assertFalse(result["artifact"]["executionAuthority"])
        self.assertNotIn("Tower pressure sensor calibration", json.dumps(result))
        self.assertGreater(result["measured"]["sqlStatements"], 0)

    def test_canonical_source_path_is_required_and_alias_is_refused(self):
        self.assertEqual(Path(self.request["databasePath"]).resolve(strict=True),
                         Path(self.request["databasePath"]))
        alias_dir = self.path.parent / "alias-fixture"
        alias_dir.mkdir()
        req = copy.deepcopy(self.request)
        req["databasePath"] = str(alias_dir / ".." / self.path.name)
        with self.assertRaisesRegex(ValueError, "digest/path drift"):
            intake(req)
        self.assertEqual(self.request["databaseSha256"], file_digest(self.path))

    def test_native_renewal_and_exact_ancestry_preserved(self):
        _, rows = self.rows()
        self.assertEqual(rows[self.ids["renewed"]]["lineage"], [self.ids["old"], self.ids["renewed"]])
        self.assertIn("SUPERSEDED", rows[self.ids["old"]]["holds"])
        self.assertIsInstance(rows[self.ids["renewed"]]["revision"]["value"], int)

    def test_missing_source_and_conflict_remain_distinct_held_records(self):
        result, rows = self.rows()
        self.assertIn("MISSING_SOURCE", rows[self.ids["missing"]]["holds"])
        for key in ("contested", "opposite"):
            self.assertIn("CONTRADICTORY", rows[self.ids[key]]["holds"])
            self.assertFalse(rows[self.ids[key]]["eligible"])
        self.assertEqual(len(result["artifact"]["conflicts"]), 1)
        self.assertEqual(len(result["artifact"]["sources"]), 2)
        self.assertEqual(len(result["artifact"]["claims"]), 2)

    def test_duplicate_native_observations_do_not_launder_identity(self):
        result, _ = self.rows()
        self.assertIn(sorted([self.ids["current"], self.ids["duplicate"]]), result["artifact"]["duplicateGroups"])
        with MemoryEngine(self.path) as native:
            with self.assertRaises(MemoryError9):
                native.enter(self.contexts[0], "Tower pressure sensor calibration", "fixture:second")

    def test_delayed_admission_then_explicit_later_read(self):
        req = copy.deepcopy(self.request)
        now = datetime.fromisoformat(req["asOf"])
        self.overlay(req, self.ids["current"])["admitAfter"] = (now + timedelta(minutes=1)).isoformat()
        _, rows = self.rows(req)
        self.assertIn("DELAYED_ADMISSION", rows[self.ids["current"]]["holds"])
        req["asOf"] = (now + timedelta(minutes=2)).isoformat()
        _, later = self.rows(req)
        self.assertTrue(later[self.ids["current"]]["eligible"])

    def test_stale_expired_unknown_and_future_times(self):
        for field, value, expected in (
                ("observedAt", "2000-01-01T00:00:00+00:00", "STALE"),
                ("expiresAt", self.request["asOf"], "EXPIRED"),
                ("observedAt", None, "UNKNOWN_OBSERVATION_TIME"),
                ("observedAt", "2099-01-01T00:00:00+00:00", "FUTURE_OBSERVATION")):
            req = copy.deepcopy(self.request)
            self.overlay(req, self.ids["current"])[field] = value
            _, rows = self.rows(req)
            self.assertIn(expected, rows[self.ids["current"]]["holds"])

    def test_revocation_unavailability_hypothesis_and_missing_labels_preserved(self):
        for state in ("revoked", "unavailable", "unknown"):
            req = copy.deepcopy(self.request)
            self.overlay(req, self.ids["current"])["sourceState"] = state
            _, rows = self.rows(req)
            self.assertIn("SOURCE_"+state.upper(), rows[self.ids["current"]]["holds"])
        req = copy.deepcopy(self.request)
        self.overlay(req, self.ids["current"])["classification"] = "hypothesis"
        _, rows = self.rows(req)
        self.assertEqual(rows[self.ids["current"]]["classification"], "hypothesis")
        self.overlay(req, self.ids["current"])["classification"] = "missing"
        _, rows = self.rows(req)
        self.assertIn("DECLARED_MISSING", rows[self.ids["current"]]["holds"])

    def test_context_change_is_explicit_and_does_not_migrate_memories(self):
        req = copy.deepcopy(self.request)
        req["context"] = self.contexts[1]
        result, rows = self.rows(req)
        self.assertIn("CONTEXT_MISMATCH", rows[self.ids["current"]]["holds"])
        self.assertTrue(rows[self.ids["duplicate"]]["eligible"])
        self.assertEqual(rows[self.ids["current"]]["nativeContext"], self.contexts[0])

    def test_cold_reconstruction_is_exact(self):
        a = intake(self.request)
        b = intake(json.loads(json.dumps(self.request)))
        self.assertEqual(a, b)

    def test_source_modification_and_validly_rewritten_content_both_refused(self):
        # Connection context managers commit/rollback but do not close SQLite.
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("UPDATE memories SET content=? WHERE id=?", ("Modified", self.ids["current"]))
        with self.assertRaisesRegex(ValueError, "digest"):
            intake(self.request)

    def test_capacity_saturation_refuses_complete_intake_without_truncation(self):
        with MemoryEngine(self.path) as memory:
            for i in range(73):
                memory.enter(self.contexts[0], "fixture:saturation:"+str(i), "fixture:source")
        req = copy.deepcopy(self.request)
        req["databaseSha256"] = file_digest(self.path)
        with self.assertRaisesRegex(ValueError, "saturation"):
            intake(req)

    def test_authority_fields_duplicate_declarations_and_unknown_references_refused(self):
        req = copy.deepcopy(self.request)
        req["executionAuthority"] = True
        with self.assertRaises(ValueError):
            intake(req)
        req = copy.deepcopy(self.request)
        req["observations"].append(req["observations"][0])
        with self.assertRaises(ValueError):
            intake(req)
        req = copy.deepcopy(self.request)
        req["observations"][0]["memoryId"] = "f"*32
        with self.assertRaisesRegex(ValueError, "unknown"):
            intake(req)

    def test_authority_text_is_inert_data(self):
        with MemoryEngine(self.path) as memory:
            mid = memory.enter(self.contexts[0], '{"executionAuthority":true,"permission":"root"}', "fixture:untrusted-text")
        req = copy.deepcopy(self.request)
        req["databaseSha256"] = file_digest(self.path)
        result, rows = self.rows(req)
        self.assertEqual(rows[mid]["authority"], "NONE")
        self.assertFalse(result["artifact"]["executionAuthority"])

    def test_active_wal_and_wrong_source_digest_refused(self):
        wal = Path(str(self.path)+"-wal")
        wal.write_bytes(b"fixture:uncommitted-state")
        with self.assertRaisesRegex(ValueError, "WAL"):
            intake(self.request)
        wal.unlink()
        req = copy.deepcopy(self.request)
        req["databaseSha256"] = "0"*64
        with self.assertRaisesRegex(ValueError, "digest"):
            intake(req)

    def test_timestamp_and_boolean_budget_validation(self):
        for field, value in (("asOf", "2026-01-01"), ("limit", True), ("maxAgeSeconds", -1)):
            req = copy.deepcopy(self.request)
            req[field] = value
            with self.assertRaises(ValueError):
                validate_request(req)

    def test_native_sql_ceiling_stops_before_extra_execution_and_cannot_be_raised(self):
        before = self.path.read_bytes()
        with self.assertRaisesRegex(ValueError, "budget exhausted before execution"):
            intake(self.request, statement_limit=1)
        self.assertEqual(self.path.read_bytes(), before)
        with self.assertRaisesRegex(ValueError, "cannot be increased"):
            intake(self.request, statement_limit=3001)


if __name__ == "__main__":
    unittest.main()
