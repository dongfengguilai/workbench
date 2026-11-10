import unittest
from average import average

class TestAverage(unittest.TestCase):
    def test_fractional_average(self):
        self.assertEqual(average([1, 2]), 1.5)

    def test_empty_average(self):
        with self.assertRaises(ValueError):
            average([])

if __name__ == "__main__":
    unittest.main()
