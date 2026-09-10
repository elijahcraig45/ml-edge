EMPTY = object()
DELETED = object()


class OpenAddressedMap:
    """An open-addressed hash map with linear probing and tombstoned deletion."""

    def __init__(self, capacity=8):
        self.keys = [EMPTY] * capacity
        self.values = [None] * capacity
        self.live = 0
        self.tombstones = 0

    def _probe(self, key):
        capacity = len(self.keys)
        index = hash(key) % capacity
        for _ in range(capacity):
            yield index
            index = (index + 1) % capacity

    def get(self, key, default=None):
        for index in self._probe(key):
            slot = self.keys[index]
            if slot is EMPTY:
                return default
            if slot is not DELETED and slot == key:
                return self.values[index]
        return default

    def put(self, key, value):
        if (self.live + 1) * 3 > len(self.keys) * 2:
            self._rehash()
        # TODO: this stops at the first free slot it sees. Once tombstones
        # exist that is not good enough — the key may live further along.
        for index in self._probe(key):
            slot = self.keys[index]
            if slot is EMPTY or slot is DELETED:
                self.keys[index] = key
                self.values[index] = value
                self.live += 1
                return
            if slot == key:
                self.values[index] = value
                return
        raise RuntimeError("table full")

    def delete(self, key):
        # TODO: blanking the slot truncates the probe run of every key that
        # had to pass through it. Use a third slot state instead.
        for index in self._probe(key):
            slot = self.keys[index]
            if slot is EMPTY:
                return False
            if slot is not DELETED and slot == key:
                self.keys[index] = EMPTY
                self.values[index] = None
                self.live -= 1
                return True
        return False

    def _rehash(self):
        old_keys, old_values = self.keys, self.values
        capacity = 8
        while capacity * 2 <= (self.live + 1) * 3:
            capacity *= 2
        self.keys = [EMPTY] * capacity
        self.values = [None] * capacity
        self.live = 0
        self.tombstones = 0
        for index, slot in enumerate(old_keys):
            if slot is not EMPTY and slot is not DELETED:
                self.put(slot, old_values[index])

    def __len__(self):
        return self.live
