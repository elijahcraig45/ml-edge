class Node:
    __slots__ = ("children", "is_word")

    def __init__(self):
        self.children = {}
        self.is_word = False


class Trie:
    def __init__(self):
        self.root = Node()

    def _descend(self, text):
        node = self.root
        for ch in text:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def insert(self, word):
        """Add a word to the trie."""
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, Node())
        node.is_word = True

    def contains(self, word):
        """True only if word was inserted."""
        node = self._descend(word)
        return node is not None and node.is_word

    def starts_with(self, prefix):
        """True if any stored word begins with prefix."""
        return self._descend(prefix) is not None

    def keys_with_prefix(self, prefix):
        """Every stored word beginning with prefix, sorted."""
        node = self._descend(prefix)
        if node is None:
            return []
        out, stack = [], [(prefix, node)]
        while stack:
            text, current = stack.pop()
            if current.is_word:
                out.append(text)
            for ch, child in current.children.items():
                stack.append((text + ch, child))
        return sorted(out)
