def balance_day(daily):
    """Earliest index whose left and right sums are equal, else -1."""
    total = sum(daily)
    left = 0
    for i, count in enumerate(daily):
        if left == total - left - count:
            return i
        left += count
    return -1
