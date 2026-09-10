def range_totals(daily, ranges):
    """One inclusive-range total per (start, end) pair, in order."""
    prefix = [0] * (len(daily) + 1)
    for i, count in enumerate(daily):
        prefix[i + 1] = prefix[i] + count
    return [prefix[end + 1] - prefix[start] for start, end in ranges]
