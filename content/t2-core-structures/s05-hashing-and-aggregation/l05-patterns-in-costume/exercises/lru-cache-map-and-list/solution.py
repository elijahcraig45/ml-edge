KEY, VALUE, PREV, NEXT = 0, 1, 2, 3


class LRUCache:
    """A fixed-capacity cache that evicts the least recently used entry."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.nodes = {}                      # key -> node
        self.head = [None, None, None, None]  # sentinel: most recent side
        self.tail = [None, None, None, None]  # sentinel: least recent side
        self.head[NEXT] = self.tail
        self.tail[PREV] = self.head

    def _unlink(self, node):
        node[PREV][NEXT] = node[NEXT]
        node[NEXT][PREV] = node[PREV]

    def _push_front(self, node):
        first = self.head[NEXT]
        node[PREV] = self.head
        node[NEXT] = first
        first[PREV] = node
        self.head[NEXT] = node

    def get(self, key, default=None):
        node = self.nodes.get(key)
        if node is None:
            return default
        self._unlink(node)
        self._push_front(node)
        return node[VALUE]

    def put(self, key, value):
        node = self.nodes.get(key)
        if node is not None:
            node[VALUE] = value
            self._unlink(node)
            self._push_front(node)
            return
        if len(self.nodes) >= self.capacity:
            victim = self.tail[PREV]
            self._unlink(victim)
            del self.nodes[victim[KEY]]
        node = [key, value, None, None]
        self.nodes[key] = node
        self._push_front(node)

    def __len__(self):
        return len(self.nodes)
