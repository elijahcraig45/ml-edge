def busiest_window(daily, k):
    """Largest total reached by any k consecutive days, or None."""
    if k <= 0 or k > len(daily):
        return None
    total = sum(daily[:k])
    best = total
    for i in range(k, len(daily)):
        total += daily[i] - daily[i - k]
        if total > best:
            best = total
    return best
