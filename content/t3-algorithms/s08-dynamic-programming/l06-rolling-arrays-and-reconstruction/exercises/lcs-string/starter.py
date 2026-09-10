def longest_common_subsequence(a, b):
    """The longest common subsequence itself, ties resolved upwards."""
    # Computes the LENGTH in one rolling row, and in doing so destroys every
    # decision the backtrack would need.
    # TODO: keep the whole table, then walk it backwards from dp[len(a)][len(b)].
    row = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        previous = list(row)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                row[j] = previous[j - 1] + 1
            else:
                row[j] = max(previous[j], row[j - 1])
    return row[len(b)]
