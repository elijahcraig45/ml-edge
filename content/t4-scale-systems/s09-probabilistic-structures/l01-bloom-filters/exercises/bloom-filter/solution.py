import hashlib


def base_hashes(item):
    """Two independent 64-bit hashes, from one SHA-256. Given; do not change."""
    digest = hashlib.sha256(str(item).encode("utf-8")).digest()
    h1 = int.from_bytes(digest[:8], "big")
    h2 = int.from_bytes(digest[8:16], "big") | 1   # odd => strides the whole array
    return h1, h2


class BloomFilter:
    def __init__(self, num_bits, num_hashes):
        self.num_bits = num_bits
        self.num_hashes = num_hashes
        self.bits = bytearray(num_bits)

    def positions(self, item):
        """The num_hashes array positions this item touches."""
        h1, h2 = base_hashes(item)
        return [(h1 + i * h2) % self.num_bits for i in range(self.num_hashes)]

    def add(self, item):
        for pos in self.positions(item):
            self.bits[pos] = 1

    def __contains__(self, item):
        return all(self.bits[pos] for pos in self.positions(item))
