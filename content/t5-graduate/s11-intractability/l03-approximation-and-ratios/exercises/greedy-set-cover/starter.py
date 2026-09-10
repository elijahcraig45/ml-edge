def greedy_set_cover(universe, sets):
    """Indices of the sets greedy chooses, in order."""
    remaining = set(universe)
    chosen = []
    for i, s in enumerate(sets):
        # TODO: this takes sets in index order, not in order of how much they
        #       cover. Score the candidates each round instead.
        if remaining & set(s):
            chosen.append(i)
            remaining -= set(s)
    if remaining:
        return None
    return chosen
