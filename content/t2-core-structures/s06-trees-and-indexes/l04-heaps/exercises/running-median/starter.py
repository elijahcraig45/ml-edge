import heapq


def running_median(values):
    """Median of every prefix, as a list of floats."""
    out = []
    seen = []
    for value in values:
        seen.append(value)
        # TODO: replace this with two heaps. Sorting the whole prefix each time
        # is correct and quadratic.
        ordered = sorted(seen)
        mid = len(ordered) // 2
        if len(ordered) % 2:
            out.append(float(ordered[mid]))
        else:
            out.append((ordered[mid - 1] + ordered[mid]) / 2)
    return out
