def chosen_items(items, capacity):
    """Indices of an optimal 0/1 knapsack subset, ties resolved by skipping."""
    n = len(items)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        weight, value = items[i - 1]
        for c in range(capacity + 1):
            dp[i][c] = dp[i - 1][c]
            if weight <= c and dp[i - 1][c - weight] + value > dp[i][c]:
                dp[i][c] = dp[i - 1][c - weight] + value

    picked, c = [], capacity
    for i in range(n, 0, -1):
        if dp[i][c] != dp[i - 1][c]:
            picked.append(i - 1)
            c -= items[i - 1][0]
    return sorted(picked)
