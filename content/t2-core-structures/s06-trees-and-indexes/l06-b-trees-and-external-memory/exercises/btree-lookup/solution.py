import bisect


def btree_search(root, key):
    """Return (found, pages_read). A node is {"keys": [...], "children": [...]}."""
    node, pages = root, 0
    while node is not None:
        pages += 1
        keys = node["keys"]
        i = bisect.bisect_left(keys, key)
        if i < len(keys) and keys[i] == key:
            return (True, pages)
        if not node["children"]:
            return (False, pages)
        node = node["children"][i]
    return (False, pages)


def levels(rows, fanout):
    """How many levels a tree with this fan-out needs to address `rows` entries."""
    height, capacity = 1, fanout
    while capacity < rows:
        capacity *= fanout
        height += 1
    return height
