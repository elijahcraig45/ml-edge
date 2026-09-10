def bellman_ford(nodes, edges, source):
    """Shortest distances from source, or None if a reachable negative cycle exists."""
    inf = float("inf")
    dist = {node: inf for node in nodes}
    if source not in dist:
        return {}
    dist[source] = 0

    # TODO: relax every edge, len(nodes) - 1 times.
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            dist[v] = dist[u] + w

    # TODO: one more pass over every edge. If anything still improves, a
    # reachable negative cycle exists and there is no answer to return.

    return {node: d for node, d in dist.items() if d < inf}
