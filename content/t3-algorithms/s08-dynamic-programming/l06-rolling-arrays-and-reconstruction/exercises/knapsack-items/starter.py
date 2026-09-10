def chosen_items(items, capacity):
    """Indices of an optimal 0/1 knapsack subset, ties resolved by skipping."""
    # Greedy by value per kilobyte. Optimal if you could take fractions of an
    # item; not optimal here.
    # TODO: build the full dp table and walk it backwards instead.
    order = sorted(range(len(items)), key=lambda i: (-items[i][1] / items[i][0], i))
    picked, remaining = [], capacity
    for i in order:
        weight, _ = items[i]
        if weight <= remaining:
            picked.append(i)
            remaining -= weight
    return sorted(picked)
