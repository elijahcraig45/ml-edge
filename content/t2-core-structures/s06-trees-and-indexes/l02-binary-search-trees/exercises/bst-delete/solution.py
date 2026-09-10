def bst_delete(node, value):
    """Return a new tree with value removed. Nodes are (value, left, right)."""
    if node is None:
        return None
    v, left, right = node
    if value < v:
        return (v, bst_delete(left, value), right)
    if value > v:
        return (v, left, bst_delete(right, value))
    if left is None:
        return right
    if right is None:
        return left
    successor = right
    while successor[1] is not None:
        successor = successor[1]
    return (successor[0], left, bst_delete(right, successor[0]))
