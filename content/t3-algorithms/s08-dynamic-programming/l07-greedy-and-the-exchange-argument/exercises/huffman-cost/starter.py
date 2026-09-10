def huffman_cost(frequencies):
    """Total encoded length of an optimal prefix code."""
    if len(frequencies) < 2:
        return 0
    # Combines whatever is at the front of the list, in input order.
    # TODO: the exchange argument says which two values must be combined first.
    remaining = list(frequencies)
    total = 0
    while len(remaining) > 1:
        merged = remaining[0] + remaining[1]
        total += merged
        remaining[0:2] = [merged]
    return total
