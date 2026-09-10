def bst_insert(node, value):
    """Return a new tree containing value. Nodes are (value, left, right)."""
    if node is None:
        return (value, None, None)
    v, left, right = node
    if value < v:
        return (v, bst_insert(left, value), right)
    if value > v:
        return (v, left, bst_insert(right, value))
    return node


def bst_contains(node, value):
    """True if value is somewhere in the tree."""
    while node is not None:
        v, left, right = node
        if value == v:
            return True
        node = left if value < v else right
    return False


def bst_height(node):
    """Nodes on the longest root-to-leaf path. Empty tree is 0."""
    if node is None:
        return 0
    return 1 + max(bst_height(node[1]), bst_height(node[2]))
