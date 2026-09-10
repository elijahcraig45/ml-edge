import random


def _contract_once(n, edges):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    live = list(edges)
    remaining = n
    while remaining > 2 and live:
        u, v = live[random.randrange(len(live))]
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            remaining -= 1
            live = [(a, b) for a, b in live if find(a) != find(b)]
    return sum(1 for a, b in edges if find(a) != find(b))


def karger_min_cut(n, edges, trials):
    """Smallest cut found over `trials` independent contraction runs."""
    if n < 2:
        return 0
    best = len(edges)
    for _ in range(trials):
        best = min(best, _contract_once(n, edges))
    return best


def trials_for_confidence(n, delta):
    """Smallest t with (1 - 2/(n(n-1))) ** t <= delta."""
    p = 2.0 / (n * (n - 1))
    t = 1
    while (1 - p) ** t > delta:
        t += 1
    return t
