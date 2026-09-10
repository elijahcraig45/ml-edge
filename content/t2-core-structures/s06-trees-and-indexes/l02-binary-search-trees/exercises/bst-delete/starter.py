def bst_delete(node, value):
    """Return a new tree with value removed. Nodes are (value, left, right)."""
    if node is None:
        return None
    v, left, right = node
    if value < v:
        return (v, bst_delete(left, value), right)
    if value > v:
        return (v, left, bst_delete(right, value))
    # Found it. TODO: handle no children, one child, and two children.
    return node
