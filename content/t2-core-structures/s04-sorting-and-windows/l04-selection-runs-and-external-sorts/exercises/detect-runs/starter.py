def normalized_runs(values):
    """Maximal already-ordered runs, each returned in ascending order."""
    runs, i, n = [], 0, len(values)
    while i < n:
        j = i + 1
        # TODO: this only ever finds ascending runs, so a descending stretch
        # comes back as a pile of one-element runs.
        while j < n and values[j][0] >= values[j - 1][0]:
            j += 1
        runs.append(list(values[i:j]))
        i = j
    return runs
