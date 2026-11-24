import copy
import unittest

from experiments.phi_genesis_010 import (
    INITIAL, Proposal, execute, metrics, replay, run, run_trace, schedule,
)


class TestNonSovereignAgency(unittest.TestCase):
    def test_authorized_transfer(self):
        p = Proposal(0, 0, 8, 3)
        nxt, status = execute(INITIAL, p, "bounded")
        self.assertEqual(status, "accepted")
        self.assertEqual((nxt[0], nxt[8]), (15, 3))
        self.assertEqual(sum(nxt), sum(INITIAL))

    def test_unauthorized_transfer(self):
        p = Proposal(8, 0, 8, 3)
        self.assertEqual(execute(INITIAL, p, "bounded"), (INITIAL, "unauthorized"))
        self.assertEqual(execute(INITIAL, p, "unrestricted")[1], "accepted")

    def test_no_self_grant(self):
        events = [Proposal(8, 0, 8, 1, "grant"), Proposal(8, 0, 8, 3)]
        trace = run_trace(events, "bounded")
        self.assertEqual([e["status"] for e in trace["events"]],
                         ["unsupported_operation", "unauthorized"])
        self.assertEqual(trace["final"], list(INITIAL))

    def test_invalid_requests_and_funds(self):
        for p, status in [
            (Proposal(-1, 0, 8, 1), "invalid_identity"),
            (Proposal(0, 0, 8, True), "invalid_transfer"),
            (Proposal(0, 0, 8, 4), "invalid_transfer"),
            (Proposal(0, 0, 0, 1), "invalid_transfer"),
            (Proposal(8, 8, 0, 1), "insufficient"),
        ]:
            self.assertEqual(execute(INITIAL, p, "bounded"), (INITIAL, status))

    def test_replay_rejects_inconsistent_trace(self):
        trace = run_trace(schedule(10010, "mixed"), "bounded")
        self.assertEqual(replay(trace), tuple(trace["final"]))
        changed = copy.deepcopy(trace)
        changed["events"][0]["after"][0] += 1
        with self.assertRaises(ValueError):
            replay(changed)

    def test_matched_cooperative_and_adversarial_controls(self):
        results = run(9)
        self.assertEqual(results, run(9))
        summary = results["summary"]
        self.assertEqual(summary["cooperative"]["bounded"],
                         summary["cooperative"]["unrestricted"])
        for regime in ("mixed", "adversarial"):
            self.assertEqual(summary[regime]["bounded"]["unauthorized_accepted"], 0)
            self.assertGreater(summary[regime]["unrestricted"]["unauthorized_accepted"], 0)
        for policies in summary.values():
            for row in policies.values():
                self.assertEqual(row["conservation_failures"], 0)
                self.assertEqual(row["replay_failures"], 0)
                self.assertEqual(row["grant_accepted"], 0)
        for seed in range(9):
            trace = run_trace(schedule(10010+seed, "cooperative"), "bounded")
            self.assertLess(metrics(trace)["variance"], metrics(run_trace([], "bounded"))["variance"])
