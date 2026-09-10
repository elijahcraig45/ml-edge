import random


def kth_smallest(values, k):
    """The k-th smallest value (0-indexed), without sorting."""
    data = list(values)
    lo, hi = 0, len(data) - 1
    while lo < hi:
        pivot_index = random.randint(lo, hi)
        data[pivot_index], data[hi] = data[hi], data[pivot_index]
        pivot = data[hi]
        boundary = lo
        for i in range(lo, hi):
            if data[i] <= pivot:
                data[boundary], data[i] = data[i], data[boundary]
                boundary += 1
        data[boundary], data[hi] = data[hi], data[boundary]

        if boundary == k:
            return data[k]
        if boundary < k:
            lo = boundary + 1
        else:
            hi = boundary - 1
    return data[k]
