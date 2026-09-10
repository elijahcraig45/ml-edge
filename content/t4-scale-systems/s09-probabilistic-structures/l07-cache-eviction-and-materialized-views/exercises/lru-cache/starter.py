class LRUCache:
    """Correct, and linear in the cache size on every operation."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.keys = []        # least-recently-used first
        self.store = {}

    def get(self, key):
        if key not in self.store:
            return None
        # TODO: `list.remove` scans the whole list to find the key.
        self.keys.remove(key)
        self.keys.append(key)
        return self.store[key]

    def put(self, key, value):
        if key in self.store:
            self.keys.remove(key)
        elif len(self.keys) >= self.capacity:
            # TODO: `list.pop(0)` shifts every remaining element left.
            del self.store[self.keys.pop(0)]
        self.keys.append(key)
        self.store[key] = value
