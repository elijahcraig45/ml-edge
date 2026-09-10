class Node:
    """One cell of a singly linked list."""
    __slots__ = ("value", "next")

    def __init__(self, value, next=None):
        self.value = value
        self.next = next


def build(values):
    """Link `values` into a chain and return its head (None if empty)."""
    head = None
    for i in range(len(values) - 1, -1, -1):
        head = Node(values[i], head)
    return head


def nth_from_end(head, n):
    """Value of the nth node counting back from the tail. n=1 is the tail."""
    # TODO: one pass, two pointers. Start one of them n nodes ahead of the
    # other, then move both until the leader falls off the end.
    return None
