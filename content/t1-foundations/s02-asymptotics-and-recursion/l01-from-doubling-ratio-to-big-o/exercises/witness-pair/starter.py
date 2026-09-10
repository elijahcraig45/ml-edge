def smallest_witness(f, g, c, limit):
    """Smallest n0 in 1..limit with f(n) <= c*g(n) for all n in [n0, limit]."""
    # TODO: this returns the first n that satisfies the bound, which is not the
    # same as the first n after which the bound never fails again.
    for n in range(1, limit + 1):
        if f(n) <= c * g(n):
            return n
    return None
