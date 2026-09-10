def lru_faults(k, requests):
    """Page faults under least-recently-used eviction."""
    if k <= 0:
        return len(requests)
    cache = []
    faults = 0
    for page in requests:
        if page in cache:
            cache.remove(page)
            cache.append(page)
        else:
            faults += 1
            if len(cache) == k:
                cache.pop(0)
            cache.append(page)
    return faults


def opt_faults(k, requests):
    """Page faults under Belady's optimal offline eviction."""
    if k <= 0:
        return len(requests)
    cache = set()
    faults = 0
    for i, page in enumerate(requests):
        if page in cache:
            continue
        faults += 1
        if len(cache) == k:
            victim, farthest = None, -1
            for p in cache:
                try:
                    nxt = requests.index(p, i + 1)
                except ValueError:
                    nxt = float("inf")
                if nxt > farthest:
                    victim, farthest = p, nxt
            cache.discard(victim)
        cache.add(page)
    return faults
