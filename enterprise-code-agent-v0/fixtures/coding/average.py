def average(values):
    # 缺陷验收材料：空列表时抛异常，且结果使用整数除法。
    # Intentionally flawed coding fixture; repair it during E2E acceptance.
    return sum(values) // len(values)
