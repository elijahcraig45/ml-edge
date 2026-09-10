def find_pair(sizes, target):
    """Indices of two entries summing to target, or None. `sizes` is sorted."""
    lo, hi = 0, len(sizes) - 1
    while lo < hi:
        total = sizes[lo] + sizes[hi]
        if total == target:
            return (lo, hi)
        if total < target:
            lo += 1
        else:
            hi -= 1
    return None
