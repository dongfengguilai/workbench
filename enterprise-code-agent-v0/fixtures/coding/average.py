"""故意包含缺陷的验收输入，不是可复用的数学库。
Intentionally defective acceptance fixture, not a reusable math library.
"""
def mean(values):
    # 缺陷：未处理空输入，且整除丢失小数。Fix source, not the tests.
    return sum(values) // len(values)
