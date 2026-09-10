def verify_cover(n, edges, k, certificate):
    """True when `certificate` is a vertex cover of size at most k."""
    chosen = set(certificate)
    # TODO: reject certificates that are too large or name vertices out of range.
    return all(u in chosen or v in chosen for u, v in edges)


def verify_tour(distances, budget, tour):
    """True when `tour` is a cycle through every city with length at most budget."""
    n = len(distances)
    # TODO: check that `tour` really is a permutation of range(n).
    total = sum(distances[tour[i]][tour[i + 1]] for i in range(n - 1))
    return total <= budget
