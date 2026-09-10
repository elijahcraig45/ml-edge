def sort_releases(releases):
    """Sort (major, minor, patch, name) rows by version, stably, no comparisons."""

    def one_pass(rows, position, k=100):
        counts = [0] * k
        for row in rows:
            counts[row[position]] += 1
        starts, total = [0] * k, 0
        for key in range(k):
            starts[key] = total
            total += counts[key]
        out = [None] * len(rows)
        for row in rows:
            out[starts[row[position]]] = row
            starts[row[position]] += 1
        return out

    rows = list(releases)
    for position in (2, 1, 0):
        rows = one_pass(rows, position)
    return rows
