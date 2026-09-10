def knapsack_fptas(values, weights, capacity, epsilon):
    """Best total value achievable, within a factor (1 - epsilon) of optimal."""
    # TODO: this enumerates every subset. Correct, and exponential.
    #       Scale the values by epsilon * max(values) / n and run the value DP.
    n = len(values)
    best = 0
    for mask in range(1 << n):
        total_w = 0
        total_v = 0
        for i in range(n):
            if mask >> i & 1:
                total_w += weights[i]
                total_v += values[i]
        if total_w <= capacity and total_v > best:
            best = total_v
    return best
