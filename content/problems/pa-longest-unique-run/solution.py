def longest_unique_run(events):
    """Length of the longest stretch with no repeated value."""
    last_seen = {}
    left = 0
    best = 0
    for i, value in enumerate(events):
        previous = last_seen.get(value)
        if previous is not None and previous >= left:
            left = previous + 1
        last_seen[value] = i
        if i - left + 1 > best:
            best = i - left + 1
    return best
