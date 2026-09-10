def inorder_iterative(root):
    """Inorder values, using an explicit stack rather than recursion."""
    out, stack, node = [], [], root
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node = node[1]
        node = stack.pop()
        out.append(node[0])
        node = node[2]
    return out
