def smallest_witness(f, g, c, limit):
    """Smallest n0 in 1..limit with f(n) <= c*g(n) for all n in [n0, limit]."""
    if limit < 1:
        return None
    n0 = None
    for n in range(limit, 0, -1):
        if f(n) <= c * g(n):
            n0 = n
        else:
            break
    return n0
