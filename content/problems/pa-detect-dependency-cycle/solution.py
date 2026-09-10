class Node:
    """One link in a singly linked dependency chain."""

    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node


def has_cycle(head):
    """True if the chain loops back on itself."""
    slow = head
    fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
