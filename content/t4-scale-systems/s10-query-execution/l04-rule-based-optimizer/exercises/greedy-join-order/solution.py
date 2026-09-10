from math import prod


def estimate_size(running, new_rows, new_name, already_joined, edges):
    """Estimated rows after joining `new_name` onto the current intermediate."""
    selectivity = prod(
        edges.get(frozenset({new_name, j}), 1.0) for j in already_joined
    )
    return running * new_rows * selectivity


def greedy_order(relations, edges):
    """Left-deep join order, chosen greedily by estimated intermediate size."""
    remaining = dict(relations)
    first = min(remaining, key=lambda n: (remaining[n], n))
    order = [first]
    running = remaining.pop(first)

    while remaining:
        connected = [
            n for n in remaining
            if any(frozenset({n, j}) in edges for j in order)
        ]
        if connected:
            pool = connected

            def key(n):
                return (estimate_size(running, remaining[n], n, order, edges), n)
        else:
            pool = list(remaining)

            def key(n):
                return (remaining[n], n)

        best = min(pool, key=key)
        running = estimate_size(running, remaining[best], best, order, edges)
        order.append(best)
        remaining.pop(best)
    return order
