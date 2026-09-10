def preorder_ops(root):
    """Every op name in pre-order, without using Python's call stack."""
    out = []
    stack = [root]
    while stack:
        node = stack.pop()
        out.append(node["op"])
        stack.extend(reversed(node["children"]))
    return out
