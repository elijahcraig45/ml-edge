import random


def kth_smallest(values, k):
    """The k-th smallest value (0-indexed), without sorting."""
    data = list(values)
    # TODO: partition around a random pivot, see where it lands, and continue
    # into the side that can still contain index k.
    return data[k]
