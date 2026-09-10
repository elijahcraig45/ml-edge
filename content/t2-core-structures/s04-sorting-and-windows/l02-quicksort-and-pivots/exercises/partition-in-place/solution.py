def partition(values, lo, hi):
    """Partition values[lo..hi] around values[hi]; return the pivot's index."""
    pivot = values[hi]
    boundary = lo
    for i in range(lo, hi):
        if values[i] <= pivot:
            values[boundary], values[i] = values[i], values[boundary]
            boundary += 1
    values[boundary], values[hi] = values[hi], values[boundary]
    return boundary
