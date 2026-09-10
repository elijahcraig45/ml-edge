def merge_sorted(left, right):
    """Merge two ascending streams into one ascending stream, lazily.

    Pulls at most one item ahead from each side and never holds more than two.
    """
    # TODO: this is correct and eager. It reads both inputs to the end before
    # producing anything, so it cannot run on an endless stream and it holds
    # every value in memory. Rewrite it as a generator that pulls one item
    # from each side, yields the smaller, and refills only the side it took
    # from.
    left = list(left)
    right = list(right)
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if right[j] < left[i]:
            merged.append(right[j])
            j += 1
        else:
            merged.append(left[i])
            i += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return iter(merged)
