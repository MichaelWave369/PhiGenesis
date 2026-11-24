import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'experiments'))
import phi_genesis_007 as g

class Relations(unittest.TestCase):
    def test_composition(self):
        f, h = (3, 8), (9, 5)
        for x in range(g.P):
            self.assertEqual(g.apply(g.compose(h,f),x),g.apply(h,g.apply(f,x)))
    def test_inverse(self):
        for a in range(1,g.P):
            self.assertEqual(g.compose((a,7),g.inverse((a,7))),g.IDENTITY)
    def test_translation(self):
        f, bridge = (3,4),(7,9)
        for x in range(g.P):
            self.assertEqual(g.apply(g.translate(f,bridge),g.apply(bridge,x)),g.apply(bridge,g.apply(f,x)))
    def test_reject_non_affine(self):
        with self.assertRaises(ValueError): g.infer([(0,0),(1,1),(2,4)])
    def test_repeatability(self):
        self.assertEqual(g.run(3),g.run(3))
    def test_held_out_transfer(self):
        result = g.run(90)
        self.assertEqual(result['totals']['transferred'],23490)
        self.assertEqual(result['accuracy']['cold'],1)
        self.assertLess(result['accuracy']['unaligned'],.1)
        self.assertEqual(result['detection']['nonlinear_detected'],1)
        self.assertGreater(result['detection']['corrupted_detected'],.9)
    def test_invalid_budget(self):
        with self.assertRaises(ValueError): g.run(0)

if __name__ == '__main__': unittest.main()
