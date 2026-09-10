def min_tour_cost(dist):
    """Cheapest tour from site 0 visiting every site once and returning."""
    n = len(dist)
    if n <= 1:
        return 0
    INF = float("inf")
    full = 1 << n
    g = [[INF] * n for _ in range(full)]
    g[1][0] = 0
    for mask in range(full):
        if not mask & 1:
            continue
        for last in range(n):
            base = g[mask][last]
            if base == INF:
                continue
            for nxt in range(n):
                if mask >> nxt & 1:
                    continue
                candidate = base + dist[last][nxt]
                if candidate < g[mask | 1 << nxt][nxt]:
                    g[mask | 1 << nxt][nxt] = candidate
    return min(g[full - 1][v] + dist[v][0] for v in range(1, n))
