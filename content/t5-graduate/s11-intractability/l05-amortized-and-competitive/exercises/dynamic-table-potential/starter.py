def table_costs(ops):
    """(actual_cost, num_after, size_after) for each push/pop."""
    num = size = 0
    out = []
    for op in ops:
        if op == "push":
            # TODO: the table has a capacity. What happens when it is full?
            num += 1
            out.append((1, num, size))
        else:
            if num > 0:
                num -= 1
            # TODO: and when it becomes mostly empty?
            out.append((1, num, size))
    return out


def potential(num, size):
    """The potential function the amortized bound is proved with."""
    # TODO: high when an expensive resize is imminent, zero right after one.
    return 0.0
