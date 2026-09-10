def range_totals(counts, queries):
    """Inclusive range totals, one per query, in query order."""
    # TODO: this is correct and quadratic. Precompute a running total over
    # `counts` once, then answer each query with one subtraction.
    return [sum(counts[lo:hi + 1]) for lo, hi in queries]
