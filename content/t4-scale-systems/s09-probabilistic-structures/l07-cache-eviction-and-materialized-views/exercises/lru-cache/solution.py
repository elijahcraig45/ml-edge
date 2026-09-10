class LRUCache:
    """O(1) per operation: an insertion-ordered dict is a hash map plus a list."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.store = {}       # oldest key first, newest last

    def get(self, key):
        if key not in self.store:
            return None
        value = self.store.pop(key)
        self.store[key] = value       # re-insert => now the newest
        return value

    def put(self, key, value):
        if key in self.store:
            self.store.pop(key)
        elif len(self.store) >= self.capacity:
            del self.store[next(iter(self.store))]   # the oldest key
        self.store[key] = value
