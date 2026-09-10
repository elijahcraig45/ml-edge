def distinct_windows(downloaders, k):
    """Count length-k stretches in which no account repeats."""
    if k <= 0 or k > len(downloaders):
        return 0
    counts = {}
    for account in downloaders[:k]:
        counts[account] = counts.get(account, 0) + 1
    found = 1 if len(counts) == k else 0
    for i in range(k, len(downloaders)):
        entering = downloaders[i]
        counts[entering] = counts.get(entering, 0) + 1
        leaving = downloaders[i - k]
        counts[leaving] -= 1
        if counts[leaving] == 0:
            del counts[leaving]
        if len(counts) == k:
            found += 1
    return found
