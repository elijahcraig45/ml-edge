class Node:
    """One entry in a singly linked changelog."""

    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node


def merge_changelogs(a, b):
    """Splice two sorted chains into one sorted chain and return its head."""
    dummy = Node(None)
    tail = dummy
    while a is not None and b is not None:
        if a.value <= b.value:
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a if a is not None else b
    return dummy.next
