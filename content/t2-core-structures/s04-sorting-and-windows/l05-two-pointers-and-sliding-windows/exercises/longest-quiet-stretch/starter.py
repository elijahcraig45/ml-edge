def longest_under(counts, budget):
    """Length of the longest consecutive run whose total is at most `budget`."""
    best = 0
    # TODO: keep a window [left..right] and a running total. Grow on the right,
    # shrink on the left while the total is over budget.
    for right, value in enumerate(counts):
        best = max(best, 1)
    return best
