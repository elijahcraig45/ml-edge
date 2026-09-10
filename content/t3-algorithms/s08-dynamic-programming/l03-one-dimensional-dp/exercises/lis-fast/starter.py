def longest_increasing(values):
    """Length of the longest strictly increasing subsequence."""
    if not values:
        return 0
    # Quadratic: best[i] is the best length of a subsequence ending at i.
    # Correct, and it re-searches every earlier position for every element.
    # TODO: index the table by LENGTH instead of by POSITION.
    best = [1] * len(values)
    for i in range(len(values)):
        for j in range(i):
            if values[j] < values[i] and best[j] + 1 > best[i]:
                best[i] = best[j] + 1
    return max(best)
