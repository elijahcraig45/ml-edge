class ChainedMap:
    """A hash map whose slots each hold a list of [key, value] pairs."""

    def __init__(self, buckets=8):
        self.slots = [[] for _ in range(buckets)]
        self.size = 0

    def _chain(self, key):
        return self.slots[hash(key) % len(self.slots)]

    def put(self, key, value):
        # TODO: this appends unconditionally, so putting the same key twice
        # stores it twice and get() keeps returning the older value.
        self._chain(key).append([key, value])
        self.size += 1

    def get(self, key, default=None):
        # TODO: walk the chain and compare keys with ==.
        return default

    def __len__(self):
        return self.size
