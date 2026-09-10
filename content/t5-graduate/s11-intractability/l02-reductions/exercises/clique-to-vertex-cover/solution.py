from itertools import combinations


def clique_to_vertex_cover(n, edges, k):
    """(n, edges, k) as a CLIQUE instance -> the equivalent VERTEX-COVER instance."""
    present = {(min(u, v), max(u, v)) for u, v in edges}
    complement = {(u, v) for u, v in combinations(range(n), 2)
                  if (u, v) not in present}
    return n, complement, n - k


def clique_to_cover_certificate(n, edges, k, clique):
    """A k-clique in the original graph -> a vertex cover of the produced graph."""
    return set(range(n)) - set(clique)
