import hashlib
import math


def hashed(item):
    """A 64-bit hash of any item. Given; do not change."""
    return int.from_bytes(hashlib.sha256(str(item).encode("utf-8")).digest()[:8], "big")


def estimate_cardinality(items, num_registers):
    """Estimate how many DISTINCT items the iterable produced."""
    m = num_registers
    p = m.bit_length() - 1          # m = 2**p, so p is the number of index bits
    width = 64 - p                  # bits left over for the leading-zero rank
    mask = (1 << width) - 1
    registers = [0] * m

    for item in items:
        h = hashed(item)
        # TODO: index = the top p bits of h
        # TODO: rank  = leading zeros in the low `width` bits of h, plus 1
        # TODO: keep the maximum rank seen in that register
        pass

    # TODO: harmonic-mean estimate, then the small-range correction.
    return 0.0
