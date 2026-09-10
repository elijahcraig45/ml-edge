def greedy_set_cover(universe, sets):
    """Indices of the sets greedy chooses, in order."""
    remaining = set(universe)
    chosen = []
    while remaining:
        best, best_gain = None, 0
        for i, s in enumerate(sets):
            gain = len(remaining & set(s))
            if gain > best_gain:
                best, best_gain = i, gain
        if best is None:
            return None
        chosen.append(best)
        remaining -= set(sets[best])
    return chosen
