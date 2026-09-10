def approx_cover(n, edges):
    """A vertex cover within a factor of 2 of the smallest one."""
    cover = set()
    for u, v in edges:
        if u not in cover and v not in cover:
            cover.add(u)
            cover.add(v)
    return cover


def matching_used(n, edges):
    """The edges that triggered an insertion — the matching the proof needs."""
    cover = set()
    matching = []
    for u, v in edges:
        if u not in cover and v not in cover:
            matching.append((u, v))
            cover.add(u)
            cover.add(v)
    return matching
