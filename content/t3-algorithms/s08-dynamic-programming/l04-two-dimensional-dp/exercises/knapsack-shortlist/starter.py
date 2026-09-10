def best_cache_value(items, capacity):
    """Maximum total value of a subset of (size, value) items fitting in capacity."""
    best = [0] * (capacity + 1)
    for weight, value in items:
        # TODO: this walks the capacity upwards, so best[c - weight] has already
        # been updated for THIS item. Which recurrence does that implement?
        for c in range(weight, capacity + 1):
            if best[c - weight] + value > best[c]:
                best[c] = best[c - weight] + value
    return best[capacity]
