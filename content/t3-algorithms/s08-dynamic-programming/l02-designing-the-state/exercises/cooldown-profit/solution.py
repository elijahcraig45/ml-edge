def max_profit_with_cooldown(prices):
    """Maximum profit with one share at a time and a one-day cooldown after selling."""
    if not prices:
        return 0
    NEG = float("-inf")
    hold = -prices[0]
    sold = NEG
    free = 0
    for price in prices[1:]:
        prev_hold, prev_sold, prev_free = hold, sold, free
        hold = max(prev_hold, prev_free - price)
        sold = prev_hold + price
        free = max(prev_free, prev_sold)
    return max(sold, free, 0)
