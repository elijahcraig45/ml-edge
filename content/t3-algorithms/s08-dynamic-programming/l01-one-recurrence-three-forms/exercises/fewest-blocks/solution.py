def fewest_blocks(target, sizes):
    """Fewest blocks summing to exactly target, or -1 if impossible."""
    INF = float("inf")
    best = [INF] * (target + 1)
    best[0] = 0
    for t in range(1, target + 1):
        for s in sizes:
            if s <= t and best[t - s] + 1 < best[t]:
                best[t] = best[t - s] + 1
    return -1 if best[target] == INF else best[target]
