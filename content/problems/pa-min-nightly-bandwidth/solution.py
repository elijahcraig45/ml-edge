def min_nightly_cap(sizes, nights):
    """Smallest per-night cap that uploads every package within nights."""
    if nights <= 0:
        return None
    if not sizes:
        return 0

    def nights_needed(cap):
        used = 1
        running = 0
        for size in sizes:
            if running + size > cap:
                used += 1
                running = size
            else:
                running += size
        return used

    lo, hi = max(sizes), sum(sizes)
    while lo < hi:
        mid = (lo + hi) // 2
        if nights_needed(mid) <= nights:
            hi = mid
        else:
            lo = mid + 1
    return lo
