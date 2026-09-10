class DisjointSet:
    def __init__(self, items):
        self.parent = {x: x for x in items}
        self.size = {x: 1 for x in items}

    def find(self, x):
        # TODO: walk up `parent` until you reach the element that is its own
        # parent — that is the root. Then walk the path again and repoint every
        # node you passed straight at the root (path compression).
        return x

    def union(self, a, b):
        # TODO: find both roots. If they are the same, return False — the two
        # are already connected and this edge would close a cycle. Otherwise
        # hang the smaller tree under the larger root and return True.
        return True


def mst_weight(nodes, edges):
    """Total weight of a minimum spanning tree, or None if the graph is disconnected."""
    if not nodes:
        return 0
    ds = DisjointSet(nodes)
    total = 0
    kept = 0
    # TODO: the edges have to be considered cheapest first.
    for weight, u, v in edges:
        if ds.union(u, v):
            total += weight
            kept += 1
    return total if kept == len(nodes) - 1 else None
