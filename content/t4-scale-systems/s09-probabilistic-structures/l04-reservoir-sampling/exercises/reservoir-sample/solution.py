import random


def reservoir_sample(stream, k):
    """Return k items chosen uniformly at random from an iterable of unknown length."""
    reservoir = []
    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        else:
            j = random.randrange(i + 1)
            if j < k:
                reservoir[j] = item
    return reservoir
