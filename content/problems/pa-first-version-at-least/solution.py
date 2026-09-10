def first_at_least(counts, threshold):
    """Index of the first entry >= threshold, or len(counts) if none is."""
    lo, hi = 0, len(counts)
    while lo < hi:
        mid = (lo + hi) // 2
        if counts[mid] < threshold:
            lo = mid + 1
        else:
            hi = mid
    return lo
