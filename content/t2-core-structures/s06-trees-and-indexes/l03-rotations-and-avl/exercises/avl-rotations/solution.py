def height(node):
    """Stored height. The empty tree has height 0."""
    return 0 if node is None else node[3]


def make(value, left, right):
    """Build a node, computing its height from its children."""
    return (value, left, right, 1 + max(height(left), height(right)))


def rotate_left(node):
    """Promote node's right child. Inorder order must not change."""
    value, left, right, _ = node
    rv, rl, rr, _ = right
    return make(rv, make(value, left, rl), rr)


def rotate_right(node):
    """Promote node's left child. Inorder order must not change."""
    value, left, right, _ = node
    lv, ll, lr, _ = left
    return make(lv, ll, make(value, lr, right))


def rebalance(node):
    value, left, right, _ = node
    bf = height(left) - height(right)
    if bf > 1:
        if height(left[1]) < height(left[2]):
            node = make(value, rotate_left(left), right)
        return rotate_right(node)
    if bf < -1:
        if height(right[2]) < height(right[1]):
            node = make(value, left, rotate_right(right))
        return rotate_left(node)
    return node


def avl_insert(node, value):
    """BST insert that rebalances on the way back up."""
    if node is None:
        return (value, None, None, 1)
    v, left, right, _ = node
    if value < v:
        return rebalance(make(v, avl_insert(left, value), right))
    if value > v:
        return rebalance(make(v, left, avl_insert(right, value)))
    return node
