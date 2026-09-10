def busiest_window(daily, k):
    """Largest total reached by any k consecutive days, or None."""
    if k <= 0 or k > len(daily):
        return None
    best = None
    for i in range(len(daily) - k + 1):
        # TODO: this re-adds all k days for every window. Neighbouring windows
        # differ by exactly two days -- use that instead.
        total = sum(daily[i:i + k])
        if best is None or total > best:
            best = total
    return best
