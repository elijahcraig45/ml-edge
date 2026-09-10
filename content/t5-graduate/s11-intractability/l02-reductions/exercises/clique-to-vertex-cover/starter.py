from itertools import combinations


def clique_to_vertex_cover(n, edges, k):
    """(n, edges, k) as a CLIQUE instance -> the equivalent VERTEX-COVER instance."""
    present = {(min(u, v), max(u, v)) for u, v in edges}
    # TODO: which graph does the cover question have to be asked about,
    #       and what size limit makes the two answers agree?
    return n, present, k


def clique_to_cover_certificate(n, edges, k, clique):
    """A k-clique in the original graph -> a vertex cover of the produced graph."""
    # TODO: a clique becomes an independent set; a cover is what is left over.
    return set(clique)
