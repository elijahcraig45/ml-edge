def max_profit_with_cooldown(prices):
    """Maximum profit with one share at a time and a one-day cooldown after selling."""
    if not prices:
        return 0
    # Two modes: holding a share, or not holding one.
    # This is the correct shape for the problem WITHOUT a cooldown.
    # TODO: find two histories that share the state (day, not holding) and whose
    # futures differ, then add the coordinate that separates them.
    hold = -prices[0]
    free = 0
    for price in prices[1:]:
        prev_hold, prev_free = hold, free
        hold = max(prev_hold, prev_free - price)
        free = max(prev_free, prev_hold + price)
    return max(free, 0)
