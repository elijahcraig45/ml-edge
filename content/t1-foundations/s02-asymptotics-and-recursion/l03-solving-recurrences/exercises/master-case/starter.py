import math


def master_case(a, b, k):
    """Master Theorem case for T(n) = a*T(n/b) + Theta(n**k)."""
    # TODO: this transcribes the textbook phrasing directly, and a binary float
    # cannot always represent log_b(a) exactly. Compare a with b**k instead.
    exponent = math.log(a, b)
    if exponent > k:
        return 1
    if exponent == k:
        return 2
    return 3
