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
        index = h >> width
        rank = width - (h & mask).bit_length() + 1
        if rank > registers[index]:
            registers[index] = rank

    alpha = 0.7213 / (1 + 1.079 / m)
    raw = alpha * m * m / sum(2.0 ** -r for r in registers)

    empty = registers.count(0)
    if raw <= 2.5 * m and empty:
        return m * math.log(m / empty)
    return raw
