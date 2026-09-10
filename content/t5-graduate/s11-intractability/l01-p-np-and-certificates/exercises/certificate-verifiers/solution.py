def verify_cover(n, edges, k, certificate):
    """True when `certificate` is a vertex cover of size at most k."""
    chosen = set(certificate)
    if len(chosen) > k:
        return False
    if any(not isinstance(v, int) or v < 0 or v >= n for v in chosen):
        return False
    return all(u in chosen or v in chosen for u, v in edges)


def verify_tour(distances, budget, tour):
    """True when `tour` is a cycle through every city with length at most budget."""
    n = len(distances)
    if sorted(tour) != list(range(n)):
        return False
    total = sum(distances[tour[i]][tour[(i + 1) % n]] for i in range(n))
    return total <= budget
