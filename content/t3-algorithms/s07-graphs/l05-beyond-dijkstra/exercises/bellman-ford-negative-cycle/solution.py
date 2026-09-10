def bellman_ford(nodes, edges, source):
    """Shortest distances from source, or None if a reachable negative cycle exists."""
    inf = float("inf")
    dist = {node: inf for node in nodes}
    if source not in dist:
        return {}
    dist[source] = 0

    for _ in range(len(nodes) - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        if not changed:
            break

    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            return None

    return {node: d for node, d in dist.items() if d < inf}
