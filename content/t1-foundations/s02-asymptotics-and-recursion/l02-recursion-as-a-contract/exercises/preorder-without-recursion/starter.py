def preorder_ops(root):
    """Every op name in pre-order, without using Python's call stack."""
    # TODO: correct, but it holds one frame per level. Replace the recursion
    # with a list you push children onto and pop nodes off.
    out = [root["op"]]
    for child in root["children"]:
        out.extend(preorder_ops(child))
    return out
