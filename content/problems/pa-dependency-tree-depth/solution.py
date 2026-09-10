def tree_depth(node):
    """Depth of a dependency tree, counting the root as level 1."""
    if node is None:
        return 0
    best = 0
    for child in node["deps"]:
        child_depth = tree_depth(child)
        if child_depth > best:
            best = child_depth
    return 1 + best
