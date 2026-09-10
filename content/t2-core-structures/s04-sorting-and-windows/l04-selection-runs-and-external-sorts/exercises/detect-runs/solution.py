def normalized_runs(values):
    """Maximal already-ordered runs, each returned in ascending order."""
    runs, i, n = [], 0, len(values)
    while i < n:
        j = i + 1
        if j < n and values[j][0] < values[i][0]:
            while j < n and values[j][0] < values[j - 1][0]:
                j += 1
            runs.append(list(values[i:j])[::-1])
        else:
            while j < n and values[j][0] >= values[j - 1][0]:
                j += 1
            runs.append(list(values[i:j]))
        i = j
    return runs
