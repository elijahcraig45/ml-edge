def master_case(a, b, k):
    """Master Theorem case for T(n) = a*T(n/b) + Theta(n**k)."""
    watershed = b ** k
    if a > watershed:
        return 1
    if a == watershed:
        return 2
    return 3
