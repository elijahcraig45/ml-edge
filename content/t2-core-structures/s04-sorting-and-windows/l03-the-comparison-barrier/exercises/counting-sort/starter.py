def counting_sort(pairs, k):
    """Sort (key, name) pairs by key, 0 <= key < k. Stable, no comparisons."""
    counts = [0] * k
    for key, _ in pairs:
        counts[key] += 1
    # TODO: turn `counts` into starting offsets with a running total, then
    # place each pair at its bucket's next free slot.
    return list(pairs)
