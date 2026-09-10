class Node:
    """One link in a singly linked list of releases."""

    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node


def reverse_chain(head):
    """Reverse the chain in place and return the new head."""
    # TODO: walk forward, rewriting one link per step. Save the node ahead
    # before you overwrite the link that points at it.
    return head
