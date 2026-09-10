def pair_within_budget(sizes, budget):
    """Indices of two packages whose sizes add up to budget, or None."""
    first_index = {}
    for j, size in enumerate(sizes):
        needed = budget - size
        if needed in first_index:
            return (first_index[needed], j)
        if size not in first_index:
            first_index[size] = j
    return None
