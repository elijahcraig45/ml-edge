class DisjointSet:
    def __init__(self, items):
        self.parent = {x: x for x in items}
        self.size = {x: 1 for x in items}

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        return True


def mst_weight(nodes, edges):
    """Total weight of a minimum spanning tree, or None if the graph is disconnected."""
    if not nodes:
        return 0
    ds = DisjointSet(nodes)
    total = 0
    kept = 0
    for weight, u, v in sorted(edges):
        if ds.union(u, v):
            total += weight
            kept += 1
            if kept == len(nodes) - 1:
                break
    return total if kept == len(nodes) - 1 else None
