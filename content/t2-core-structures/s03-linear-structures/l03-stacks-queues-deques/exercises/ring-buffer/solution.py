class RingBuffer:
    """A fixed-capacity FIFO queue backed by one preallocated list."""

    def __init__(self, capacity):
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self._slots = [None] * capacity
        self._head = 0     # index of the oldest live item
        self._count = 0    # how many items are live

    @property
    def capacity(self):
        return len(self._slots)

    def __len__(self):
        return self._count

    def is_empty(self):
        return self._count == 0

    def is_full(self):
        return self._count == len(self._slots)

    def push(self, item):
        if self.is_full():
            raise IndexError("buffer is full")
        tail = (self._head + self._count) % len(self._slots)
        self._slots[tail] = item
        self._count += 1

    def pop(self):
        if self._count == 0:
            raise IndexError("buffer is empty")
        item = self._slots[self._head]
        self._slots[self._head] = None       # drop the reference
        self._head = (self._head + 1) % len(self._slots)
        self._count -= 1
        return item
