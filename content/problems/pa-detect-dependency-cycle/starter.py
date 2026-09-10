class Node:
    """One link in a singly linked dependency chain."""

    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node


def has_cycle(head):
    """True if the chain loops back on itself."""
    seen = []
    node = head
    while node is not None:
        # TODO: this works and rescans `seen` on every step. Two references
        # moving at different speeds decide the same question without it.
        if node in seen:
            return True
        seen.append(node)
        node = node.next
    return False
