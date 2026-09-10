def agents_needed(jobs):
    """Smallest number of agents that can run every job."""
    if not jobs:
        return 0
    starts = sorted(start for start, _end in jobs)
    ends = sorted(end for _start, end in jobs)
    running = 0
    best = 0
    s = 0
    e = 0
    while s < len(starts):
        if starts[s] < ends[e]:
            running += 1
            if running > best:
                best = running
            s += 1
        else:
            running -= 1
            e += 1
    return best
