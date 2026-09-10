class Node:
    """One entry in a singly linked changelog."""

    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node


def merge_changelogs(a, b):
    """Splice two sorted chains into one sorted chain and return its head."""
    # TODO: take the smaller of the two heads each step. A throwaway node to
    # build behind removes the special case for the very first link.
    return a
