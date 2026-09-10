def slowest_rate(sizes, hours):
    """Smallest whole-number rate that clears the queue within hours."""
    if not sizes:
        return 0
    if hours < len(sizes):
        return None

    def hours_needed(rate):
        return sum(-(-size // rate) for size in sizes)

    lo, hi = 1, max(sizes)
    while lo < hi:
        mid = (lo + hi) // 2
        if hours_needed(mid) <= hours:
            hi = mid
        else:
            lo = mid + 1
    return lo
