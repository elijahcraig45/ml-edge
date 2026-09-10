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


def walk(head):
    """Collect the chain's values, head first. Provided for the tests."""
    out = []
    while head is not None:
        out.append(head.value)
        head = head.next
    return out


def reverse(head):
    """Reverse the chain in place and return the new head."""
    # TODO: rewire `next` on each node as you walk. You need to remember the
    # node behind you, and you must not lose the node in front of you.
    return head
