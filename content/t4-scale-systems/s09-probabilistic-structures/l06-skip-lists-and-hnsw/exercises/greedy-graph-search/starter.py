import heapq


def distance(a, b):
    """Euclidean distance between two coordinate tuples. Given."""
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def greedy_search(graph, points, entry, query, ef):
    """One HNSW layer search.

    graph  : node id -> list of neighbour ids
    points : node id -> coordinate tuple
    entry  : node id to start from
    query  : coordinate tuple
    ef     : beam width — how many candidates are kept alive

    Returns the ids of the (at most ef) closest nodes found, ordered by
    distance to the query, ties broken by id.
    """
    # TODO: beam search.
    #   candidates: min-heap of (distance, node) still to expand
    #   results:    max-heap of (-distance, node), never larger than ef
    # Stop when the closest unexpanded candidate is farther than the worst
    # result and the beam is full.
    return [entry]
