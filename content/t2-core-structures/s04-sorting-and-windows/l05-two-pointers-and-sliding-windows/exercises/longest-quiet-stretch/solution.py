def longest_under(counts, budget):
    """Length of the longest consecutive run whose total is at most `budget`."""
    best = 0
    total = 0
    left = 0
    for right, value in enumerate(counts):
        total += value
        while total > budget:
            total -= counts[left]
            left += 1
        best = max(best, right - left + 1)
    return best
