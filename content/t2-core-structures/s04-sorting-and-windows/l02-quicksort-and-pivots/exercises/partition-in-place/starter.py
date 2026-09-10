def partition(values, lo, hi):
    """Partition values[lo..hi] around values[hi]; return the pivot's index."""
    pivot = values[hi]
    # TODO: scan values[lo..hi-1], keeping a boundary index for the region that
    # is known to be <= pivot, then drop the pivot at that boundary.
    return lo
