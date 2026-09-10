import random


def reservoir_sample(stream, k):
    """Return k items chosen uniformly at random from an iterable of unknown length."""
    reservoir = []
    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        # TODO: items past the first k are currently thrown away, so this
        # returns the FIRST k items rather than a uniform sample.
        # Give item i a k/(i+1) chance of displacing a random slot.
    return reservoir
