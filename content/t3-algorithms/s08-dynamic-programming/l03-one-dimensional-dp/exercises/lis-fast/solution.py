from bisect import bisect_left


def longest_increasing(values):
    """Length of the longest strictly increasing subsequence."""
    tails = []
    for x in values:
        k = bisect_left(tails, x)
        if k == len(tails):
            tails.append(x)
        else:
            tails[k] = x
    return len(tails)
