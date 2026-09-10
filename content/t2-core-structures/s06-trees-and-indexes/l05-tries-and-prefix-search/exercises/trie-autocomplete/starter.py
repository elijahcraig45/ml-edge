class Node:
    __slots__ = ("children", "is_word")

    def __init__(self):
        self.children = {}
        self.is_word = False


class Trie:
    def __init__(self):
        self.root = Node()

    def insert(self, word):
        """Add a word to the trie."""
        # TODO: walk down, creating child nodes as needed, then flag the last one.

    def contains(self, word):
        """True only if word was inserted."""
        # TODO
        return False

    def starts_with(self, prefix):
        """True if any stored word begins with prefix."""
        # TODO
        return False

    def keys_with_prefix(self, prefix):
        """Every stored word beginning with prefix, sorted."""
        # TODO: find the prefix node, then walk its subtree.
        return []
