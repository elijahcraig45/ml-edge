def min_tour_cost(dist):
    """Cheapest tour from site 0 visiting every site once and returning."""
    n = len(dist)
    if n <= 1:
        return 0
    # Nearest neighbour: always hop to the closest unvisited site.
    # Fast, and not optimal. TODO: replace with the subset DP.
    visited = {0}
    current = 0
    total = 0
    while len(visited) < n:
        nxt = min((v for v in range(n) if v not in visited),
                  key=lambda v: (dist[current][v], v))
        total += dist[current][nxt]
        visited.add(nxt)
        current = nxt
    return total + dist[current][0]
