def longest_build_run(builds):
    """Length of the longest run of consecutive build numbers present."""
    present = set(builds)
    best = 0
    for build in present:
        if build - 1 in present:
            continue
        length = 1
        nxt = build + 1
        while nxt in present:
            length += 1
            nxt += 1
        if length > best:
            best = length
    return best
