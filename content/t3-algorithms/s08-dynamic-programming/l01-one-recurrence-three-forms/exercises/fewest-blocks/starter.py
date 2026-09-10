def fewest_blocks(target, sizes):
    """Fewest blocks summing to exactly target, or -1 if impossible."""
    INF = float("inf")

    # The naive recursion: correct, and it re-solves the same target endlessly.
    # TODO: give it somewhere to write down answers it has already computed.
    def f(t):
        if t == 0:
            return 0
        if t < 0:
            return INF
        return 1 + min(f(t - s) for s in sizes)

    answer = f(target)
    return -1 if answer == INF else answer
