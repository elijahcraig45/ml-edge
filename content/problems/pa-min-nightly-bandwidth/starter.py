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

    # TODO: this tries every cap in turn. The workable caps form a contiguous
    # range, so search it by halving instead of walking it.
    cap = max(sizes)
    while nights_needed(cap) > nights:
        cap += 1
    return cap
