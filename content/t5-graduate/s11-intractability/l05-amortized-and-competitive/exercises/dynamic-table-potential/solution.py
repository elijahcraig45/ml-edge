def table_costs(ops):
    """(actual_cost, num_after, size_after) for each push/pop."""
    num = size = 0
    out = []
    for op in ops:
        if op == "push":
            copy = 0
            if num == size:
                copy = num
                size = 1 if size == 0 else 2 * size
            num += 1
            out.append((1 + copy, num, size))
        else:
            if num == 0:
                out.append((1, num, size))
                continue
            num -= 1
            copy = 0
            if num > 0 and 4 * num <= size:
                copy = num
                size //= 2
            out.append((1 + copy, num, size))
    return out


def potential(num, size):
    """The potential function the amortized bound is proved with."""
    if size == 0:
        return 0.0
    if 2 * num >= size:
        return float(2 * num - size)
    return size / 2 - num
