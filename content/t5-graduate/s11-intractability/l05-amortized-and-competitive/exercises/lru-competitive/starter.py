def lru_faults(k, requests):
    """Page faults under least-recently-used eviction."""
    if k <= 0:
        return len(requests)
    cache = []
    faults = 0
    for page in requests:
        if page in cache:
            continue          # TODO: a hit is a use. LRU has to notice it.
        faults += 1
        if len(cache) == k:
            cache.pop(0)
        cache.append(page)
    return faults


def opt_faults(k, requests):
    """Page faults under Belady's optimal offline eviction."""
    if k <= 0:
        return len(requests)
    cache = []
    faults = 0
    for i, page in enumerate(requests):
        if page in cache:
            cache.remove(page)
            cache.append(page)
            continue
        faults += 1
        if len(cache) == k:
            # TODO: Belady looks forward, not backward.
            cache.pop(0)
        cache.append(page)
    return faults
