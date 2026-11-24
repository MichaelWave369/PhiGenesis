import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'experiments'))
import phi_genesis_009 as g
import numpy as np

class Constructive(unittest.TestCase):
    def test_library(self):
        self.assertEqual(len(g.KEYS), 163)
        self.assertEqual(len(set(g.KEYS)), 163)
        self.assertEqual(g.LOW_COUNT, 37)
    def test_independent_oracle(self):
        for i, k in enumerate(g.KEYS):
            np.testing.assert_array_equal(g.DESIGN[:, i], g.oracle(sum(1 << b for b in k)))
    def test_repeatability(self):
        self.assertEqual(g.run(2), g.run(2))
    def test_recovery_and_rejection(self):
        r = g.run(12)['summary']
        for k in ('sparse_composed','low_degree'):
            self.assertEqual(r[k]['exact_support'], 12)
            self.assertEqual(r[k]['generated_rejections'], 0)
            self.assertLess(r[k]['mean_test_mse']['generated_sparse'], .001)
        for k in ('unreachable','noise'):
            self.assertEqual(r[k]['generated_rejections'], 12)
    def test_budget(self):
        with self.assertRaises(ValueError): g.run(0)
        with self.assertRaises(ValueError): g.generate_features(5)
    def test_partitions(self):
        r = g.run(1)
        self.assertEqual(r['train']+r['validation']+r['test'], 256)
        self.assertEqual(r['worlds'], 4)

if __name__ == '__main__': unittest.main()
