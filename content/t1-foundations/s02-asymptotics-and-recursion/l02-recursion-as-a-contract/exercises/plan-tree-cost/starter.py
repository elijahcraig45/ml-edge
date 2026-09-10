def plan_summary(node):
    """(depth, total_rows) for the subtree rooted at node."""
    # TODO: this only looks at the node itself. Recurse into node["children"],
    # take the maximum depth and the sum of the totals.
    return 1, node["rows"]
