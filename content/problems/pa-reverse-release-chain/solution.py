class Node:
    """One link in a singly linked list of releases."""

    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node


def reverse_chain(head):
    """Reverse the chain in place and return the new head."""
    previous = None
    current = head
    while current is not None:
        nxt = current.next
        current.next = previous
        previous = current
        current = nxt
    return previous
