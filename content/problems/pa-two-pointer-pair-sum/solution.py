def pair_summing_to(counts, target):
    """Indices of two entries summing to target, or None."""
    left, right = 0, len(counts) - 1
    while left < right:
        total = counts[left] + counts[right]
        if total == target:
            return (left, right)
        if total < target:
            left += 1
        else:
            right -= 1
    return None
