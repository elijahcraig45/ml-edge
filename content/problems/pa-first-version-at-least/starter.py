def first_at_least(counts, threshold):
    """Index of the first entry >= threshold, or len(counts) if none is."""
    # TODO: binary search for the boundary, not for the value. Keep lo and hi as
    # the range of positions the answer could still occupy.
    return len(counts)
