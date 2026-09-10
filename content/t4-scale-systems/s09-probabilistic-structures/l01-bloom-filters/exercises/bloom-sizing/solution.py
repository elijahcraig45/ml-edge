import math


def optimal_parameters(n, p):
    """Return (num_bits, num_hashes) for n items at target error rate p."""
    num_bits = math.ceil(-n * math.log(p) / (math.log(2) ** 2))
    num_hashes = max(1, round((num_bits / n) * math.log(2)))
    return num_bits, num_hashes
