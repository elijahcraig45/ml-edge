class GrowableArray:
    """A dynamic array that reports how many element copies it has performed."""

    def __init__(self):
        self._slots = []
        self._size = 0
        self.capacity = 0
        self.copies = 0

    def _grow(self):
        new_capacity = 1 if self.capacity == 0 else self.capacity * 2
        bigger = [None] * new_capacity
        for i in range(self._size):
            bigger[i] = self._slots[i]
        self.copies += self._size
        self._slots = bigger
        self.capacity = new_capacity

    def append(self, value):
        if self._size == self.capacity:
            self._grow()
        self._slots[self._size] = value
        self._size += 1

    def __len__(self):
        return self._size

    def __getitem__(self, index):
        if not 0 <= index < self._size:
            raise IndexError(index)
        return self._slots[index]
