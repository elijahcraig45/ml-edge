def knapsack_fptas(values, weights, capacity, epsilon):
    """Best total value achievable, within a factor (1 - epsilon) of optimal."""
    n = len(values)
    usable = [i for i in range(n) if weights[i] <= capacity]
    if not usable:
        return 0
    vmax = max(values[i] for i in usable)
    if vmax == 0:
        return 0
    scale = epsilon * vmax / n
    scaled = {i: int(values[i] / scale) for i in usable}
    total = sum(scaled.values())
    INF = float("inf")
    least_weight = [INF] * (total + 1)
    true_value = [0] * (total + 1)
    least_weight[0] = 0
    for i in usable:
        s = scaled[i]
        if s == 0:
            continue
        w = weights[i]
        v = values[i]
        for t in range(total, s - 1, -1):
            if least_weight[t - s] + w < least_weight[t]:
                least_weight[t] = least_weight[t - s] + w
                true_value[t] = true_value[t - s] + v
    for t in range(total, -1, -1):
        if least_weight[t] <= capacity:
            return true_value[t]
    return 0
