import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'experiments'))
from phi_genesis_006 import run

class Communication(unittest.TestCase):
    def test_reproducibility(self):
        self.assertEqual(run(3, 50), run(3, 50))
    def test_shape_and_bounds(self):
        result = run(3, 50)
        self.assertEqual(len(result['per_seed']), 3)
        for method in ('factorized','holistic','random_message'):
            for metric in ('seen_accuracy','unseen_accuracy'):
                self.assertTrue(0 <= result[method][metric] <= 1)
        for row in result['per_seed']:
            self.assertIn(row['holdout'], range(9))
            self.assertEqual(len(row['factorized']), 9)
    def test_transfer(self):
        result = run(12, 6000)
        self.assertGreater(result['factorized']['unseen_accuracy'], .70)
        self.assertGreater(result['factorized']['unseen_accuracy'], result['holistic']['unseen_accuracy'])
    def test_bad_budget(self):
        with self.assertRaises(ValueError): run(0, 50)
        with self.assertRaises(ValueError): run(3, 0)
