def shortest_run_to_quota(daily, quota):
    """Length of the shortest run of days totalling at least quota, else 0."""
    if quota <= 0:
        return 0
    best = 0
    total = 0
    left = 0
    for right, count in enumerate(daily):
        total += count
        while total >= quota:
            width = right - left + 1
            if best == 0 or width < best:
                best = width
            total -= daily[left]
            left += 1
    return best
