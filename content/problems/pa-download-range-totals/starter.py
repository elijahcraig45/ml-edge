def range_totals(daily, ranges):
    """One inclusive-range total per (start, end) pair, in order."""
    totals = []
    for start, end in ranges:
        # TODO: this walks the range every time it is asked about. Precompute
        # something once so each answer costs a single subtraction.
        totals.append(sum(daily[start:end + 1]))
    return totals
