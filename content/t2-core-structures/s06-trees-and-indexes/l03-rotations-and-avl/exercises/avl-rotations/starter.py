def height(node):
    """Stored height. The empty tree has height 0."""
    return 0 if node is None else node[3]


def make(value, left, right):
    """Build a node, computing its height from its children."""
    return (value, left, right, 1 + max(height(left), height(right)))


def rotate_left(node):
    """Promote node's right child. Inorder order must not change."""
    # TODO
    return node


def rotate_right(node):
    """Promote node's left child. Inorder order must not change."""
    # TODO
    return node


def avl_insert(node, value):
    """BST insert that rebalances on the way back up."""
    if node is None:
        return (value, None, None, 1)
    v, left, right, _ = node
    if value < v:
        return make(v, avl_insert(left, value), right)     # TODO: rebalance
    if value > v:
        return make(v, left, avl_insert(right, value))     # TODO: rebalance
    return node
