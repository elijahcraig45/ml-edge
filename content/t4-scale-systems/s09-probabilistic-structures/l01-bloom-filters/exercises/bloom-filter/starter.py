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
        # TODO: combine the two base hashes as h1 + i*h2, modulo num_bits.
        return []

    def add(self, item):
        # TODO: set every position this item touches.
        pass

    def __contains__(self, item):
        # TODO: "possibly present" only if every position is already set.
        return False
