def dijkstra(graph, source):
    """Shortest distance from source to every reachable node."""
    # This is correct, and it finds the closest unfinished node by scanning
    # every node on every round: O(V^2) before a single edge is relaxed.
    # TODO: replace the scan with a heap. `heapq` has no decrease-key, so push
    # a new entry when a distance improves and skip entries that are already
    # out of date when they pop.
    if source not in graph:
        return {}
    inf = float("inf")
    dist = {node: inf for node in graph}
    dist[source] = 0
    done = set()
    while len(done) < len(graph):
        best, u = inf, None
        for node in graph:
            if node not in done and dist[node] < best:
                best, u = dist[node], node
        if u is None:
            break
        done.add(u)
        for v, weight in graph[u]:
            if best + weight < dist[v]:
                dist[v] = best + weight
    return {node: d for node, d in dist.items() if d < inf}
