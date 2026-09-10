def redundant_connection(edges):
    """The last edge whose endpoints were already connected, or None."""
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:
            parent[x], x = root, parent[x]
        return root

    last = None
    for a, b in edges:
        root_a, root_b = find(a), find(b)
        if root_a == root_b:
            last = (a, b)
        else:
            parent[root_b] = root_a
    return last
