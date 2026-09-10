import bisect


def btree_search(root, key):
    """Return (found, pages_read). A node is {"keys": [...], "children": [...]}."""
    node, pages = root, 0
    # TODO: at each node, count the keys smaller than `key`; that index is both
    # the slot to test for equality and the child to descend into.
    return (False, pages)


def levels(rows, fanout):
    """How many levels a tree with this fan-out needs to address `rows` entries."""
    # TODO: multiply capacity by fanout until it reaches rows.
    return 1
