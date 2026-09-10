import random


def karger_min_cut(n, edges, trials):
    """Smallest cut found over `trials` independent contraction runs."""
    if n < 2:
        return 0
    # TODO: contract random edges until two vertices remain, and count the
    #       original edges crossing between the two groups. Repeat `trials` times.
    return len(edges)


def trials_for_confidence(n, delta):
    """Smallest t with (1 - 2/(n(n-1))) ** t <= delta."""
    # TODO: p is the per-run success probability; find the smallest t that works.
    return 1
