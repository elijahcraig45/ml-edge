def plan_summary(node):
    """(depth, total_rows) for the subtree rooted at node."""
    depth = 0
    total = node["rows"]
    for child in node["children"]:
        child_depth, child_total = plan_summary(child)
        depth = max(depth, child_depth)
        total += child_total
    return depth + 1, total
