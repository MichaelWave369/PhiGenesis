import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'experiments'))
from phi_genesis_008 import run

class Selection(unittest.TestCase):
    def test_reproducibility(self):
        self.assertEqual(run(3),run(3))
    def test_familiar(self):
        r=run(12)
        self.assertGreaterEqual(r['familiar_correct_selection'], 32)
        self.assertLess(r['familiar_mean_mse']['selected'], .1)
    def test_novel_rejection(self):
        self.assertGreaterEqual(run(12)['summary']['novel']['rejected'],10)
    def test_budget(self):
        with self.assertRaises(ValueError): run(0)
    def test_partitions(self):
        r=run(2)
        self.assertEqual(r['train']+r['validation']+r['test'],256)
        self.assertEqual(r['worlds'],8)

if __name__=='__main__': unittest.main()
