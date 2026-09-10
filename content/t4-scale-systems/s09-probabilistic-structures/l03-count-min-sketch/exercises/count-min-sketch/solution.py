import hashlib


def row_hash(item, row):
    """A different 64-bit hash per row. Given; do not change."""
    return int.from_bytes(
        hashlib.sha256(f"{row}:{item}".encode("utf-8")).digest()[:8], "big"
    )


class CountMinSketch:
    def __init__(self, width, depth):
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]

    def add(self, item, amount=1):
        """Record `amount` more occurrences of `item`."""
        for row in range(self.depth):
            self.table[row][row_hash(item, row) % self.width] += amount

    def estimate(self, item):
        """An upper bound on how many times `item` was added."""
        return min(
            self.table[row][row_hash(item, row) % self.width]
            for row in range(self.depth)
        )
