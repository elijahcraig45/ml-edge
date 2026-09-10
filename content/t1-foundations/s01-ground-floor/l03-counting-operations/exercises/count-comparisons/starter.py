def growth_table(fn, sizes):
    """Return [(size, count, ratio_to_previous_or_None), ...]."""
    rows = []
    # TODO: track the previous count so you can compute each ratio.
    for size in sizes:
        count = fn(size)
        rows.append((size, count, None))
    return rows
