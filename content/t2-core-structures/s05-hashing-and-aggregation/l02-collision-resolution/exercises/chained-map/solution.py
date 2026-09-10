class ChainedMap:
    """A hash map whose slots each hold a list of [key, value] pairs."""

    def __init__(self, buckets=8):
        self.slots = [[] for _ in range(buckets)]
        self.size = 0

    def _chain(self, key):
        return self.slots[hash(key) % len(self.slots)]

    def put(self, key, value):
        chain = self._chain(key)
        for pair in chain:
            if pair[0] == key:
                pair[1] = value
                return
        chain.append([key, value])
        self.size += 1

    def get(self, key, default=None):
        for pair in self._chain(key):
            if pair[0] == key:
                return pair[1]
        return default

    def __len__(self):
        return self.size
