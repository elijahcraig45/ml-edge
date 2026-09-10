class DisjointSet:
    """Disjoint sets over 0 .. n-1."""

    def __init__(self, n):
        self.parent = list(range(n))
        self.count = n
        # TODO: you will want a rank list here too.

    def find(self, x):
        # Correct, but it never flattens anything, so the next find is as
        # slow as this one. TODO: compress the path on the way back.
        while self.parent[x] != x:
            x = self.parent[x]
        return x

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False
        # TODO: attach the shorter tree under the taller one instead of always
        # attaching a under b.
        self.parent[root_a] = root_b
        self.count -= 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)
