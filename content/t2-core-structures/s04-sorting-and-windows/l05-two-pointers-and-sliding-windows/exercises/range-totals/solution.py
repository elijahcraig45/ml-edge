def range_totals(counts, queries):
    """Inclusive range totals, one per query, in query order."""
    prefix = [0] * (len(counts) + 1)
    for i, c in enumerate(counts):
        prefix[i + 1] = prefix[i] + c
    return [prefix[hi + 1] - prefix[lo] for lo, hi in queries]
