def runs_summing_to(deltas, target):
    """Count contiguous stretches whose values total exactly target."""
    seen = {0: 1}
    running = 0
    found = 0
    for delta in deltas:
        running += delta
        found += seen.get(running - target, 0)
        seen[running] = seen.get(running, 0) + 1
    return found
