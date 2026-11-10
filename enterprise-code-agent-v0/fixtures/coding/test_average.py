import unittest
from average import mean

class MeanTests(unittest.TestCase):
    def test_fraction(self):
        self.assertEqual(mean([1, 2]), 1.5)

    def test_negative(self):
        self.assertEqual(mean([-3, 2]), -0.5)

    def test_single(self):
        self.assertEqual(mean([7]), 7.0)

    def test_empty(self):
        with self.assertRaises(ValueError):
            mean([])

if __name__ == '__main__':
    unittest.main()
