def growth_table(fn, sizes):
    """Return [(size, count, ratio_to_previous_or_None), ...]."""
    rows = []
    previous = None
    for size in sizes:
        count = fn(size)
        if previous is None or previous == 0:
            ratio = None
        else:
            ratio = round(count / previous, 2)
        rows.append((size, count, ratio))
        previous = count
    return rows
