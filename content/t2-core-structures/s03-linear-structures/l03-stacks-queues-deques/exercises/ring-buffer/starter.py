class RingBuffer:
    """A fixed-capacity FIFO queue backed by one preallocated list.

    This version tracks a head and a tail index and nothing else. It works,
    right up until you try to store `capacity` items — because `head == tail`
    has to mean two different things and it can only mean one.
    """

    def __init__(self, capacity):
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self._slots = [None] * capacity
        self._head = 0     # index of the oldest live item
        self._tail = 0     # index of the next free slot

    @property
    def capacity(self):
        return len(self._slots)

    def __len__(self):
        return (self._tail - self._head) % len(self._slots)

    def is_empty(self):
        return self._head == self._tail

    def is_full(self):
        # TODO: this calls the buffer full one slot early, so a capacity of 3
        # only ever holds 2 items. Find a representation that can tell "empty"
        # and "full" apart without sacrificing a slot.
        return (self._tail + 1) % len(self._slots) == self._head

    def push(self, item):
        if self.is_full():
            raise IndexError("buffer is full")
        self._slots[self._tail] = item
        self._tail = (self._tail + 1) % len(self._slots)

    def pop(self):
        if self.is_empty():
            raise IndexError("buffer is empty")
        item = self._slots[self._head]
        self._slots[self._head] = None
        self._head = (self._head + 1) % len(self._slots)
        return item
