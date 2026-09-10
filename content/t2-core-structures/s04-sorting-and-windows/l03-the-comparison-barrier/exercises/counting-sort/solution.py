def counting_sort(pairs, k):
    """Sort (key, name) pairs by key, 0 <= key < k. Stable, no comparisons."""
    counts = [0] * k
    for key, _ in pairs:
        counts[key] += 1

    starts = [0] * k
    total = 0
    for key in range(k):
        starts[key] = total
        total += counts[key]

    out = [None] * len(pairs)
    for pair in pairs:
        out[starts[pair[0]]] = pair
        starts[pair[0]] += 1
    return out
