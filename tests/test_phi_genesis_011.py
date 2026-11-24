import unittest

from experiments.phi_genesis_011 import (
    N, ROUNDS, REGIMES, majority, observations, predict, run,
)


class TestLocalPerception(unittest.TestCase):
    def test_majority(self):
        self.assertEqual(majority((1, 0, 1)), 1)
        self.assertEqual(majority((0, 1, 0)), 0)
        for invalid in ((1, 0), (1, 2, 0), (True, 0, 1)):
            with self.assertRaises(ValueError):
                majority(invalid)

    def test_wraparound_and_matched_first_observation(self):
        samples = [(0, 0, 0)] * N
        samples[0] = (0, 1, 1)
        samples[1] = (1, 0, 0)
        samples[-1] = (1, 0, 0)
        self.assertEqual(predict(samples, 0, "single"), 0)
        self.assertEqual(predict(samples, 0, "local_three"), 1)
        self.assertEqual(predict(samples, 0, "ring_three"), 1)

    def test_non_neighbor_changes_cannot_affect_prediction(self):
        samples = [(0, 0, 0)] * N
        changed = samples.copy()
        changed[4] = (1, 1, 1)
        self.assertEqual(predict(samples, 0, "ring_three"),
                         predict(changed, 0, "ring_three"))
        changed[1] = (0, 1, 1)
        self.assertEqual(predict(samples, 0, "ring_three"),
                         predict(changed, 0, "ring_three"))

    def test_invalid_identity_and_policy(self):
        samples = [(0, 0, 0)] * N
        for actor in (-1, N, True):
            with self.assertRaises(ValueError):
                predict(samples, actor, "single")
        with self.assertRaises(ValueError):
            predict(samples, 0, "global")

    def test_seeded_world(self):
        for regime in REGIMES:
            rows = list(observations(11000, regime))
            self.assertEqual(rows, list(observations(11000, regime)))
            self.assertEqual(len(rows), ROUNDS)
            for truth, samples in rows:
                self.assertIn(truth, (0, 1))
                self.assertEqual(len(samples), N)
                self.assertTrue(all(len(s) == 3 for s in samples))

    def test_report_accounting(self):
        result = run(9)
        self.assertEqual(result, run(9))
        self.assertEqual(len(result["trials"]), 27)
        for regime in REGIMES:
            group = result["summary"][regime]
            for p in ("single", "local_three", "ring_three"):
                self.assertEqual(group[p]["decisions"], 9*N*ROUNDS)
                self.assertAlmostEqual(group[p]["accuracy"],
                                       group[p]["correct"]/group[p]["decisions"])
            self.assertEqual(group["local_three"]["observations_per_decision"],
                             group["ring_three"]["observations_per_decision"])
            d = group["paired_ring_minus_local"]
            self.assertEqual(d["positive"] + d["negative"] + d["tied"], 9)
