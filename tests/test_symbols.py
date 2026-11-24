import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'experiments'))
import phi_genesis_005 as g

class Symbols(unittest.TestCase):
    def test_roundtrip(self):
        data = [3,7,2]*300
        rules = g.fit(data)
        self.assertTrue(rules)
        self.assertEqual(g.decode(g.encode(data,rules),rules),data)
        self.assertLess(g.cost(g.encode(data,rules),len(rules)),g.cost(data,0))
    def test_seed_reproducibility(self):
        self.assertEqual(g.run(3),g.run(3))
    def test_empty(self):
        self.assertEqual(g.fit([]),[])
        self.assertEqual(g.decode([],[]),[])
    def test_invalid_budget(self):
        with self.assertRaises(ValueError): g.run(0)
