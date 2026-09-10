import heapq


def dijkstra(graph, source):
    """Shortest distance from source to every reachable node."""
    if source not in graph:
        return {}
    dist = {source: 0}
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue                       # stale: a better route arrived later
        for v, weight in graph[u]:
            candidate = d + weight
            if candidate < dist.get(v, float("inf")):
                dist[v] = candidate
                heapq.heappush(heap, (candidate, v))
    return dist
