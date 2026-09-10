import math


def optimal_parameters(n, p):
    """Return (num_bits, num_hashes) for n items at target error rate p."""
    # TODO: m = -n ln(p) / (ln 2)^2, rounded UP to a whole number of bits.
    # TODO: k = (m / n) ln 2, rounded to the nearest integer, at least 1.
    num_bits = 8 * n
    num_hashes = 3
    return num_bits, num_hashes
