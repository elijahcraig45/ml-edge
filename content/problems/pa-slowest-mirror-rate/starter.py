def slowest_rate(sizes, hours):
    """Smallest whole-number rate that clears the queue within hours."""
    if not sizes:
        return 0
    if hours < len(sizes):
        return None

    def hours_needed(rate):
        return sum(-(-size // rate) for size in sizes)

    # TODO: this walks the rates one at a time. Hours-needed only falls as the
    # rate rises, so the workable rates form a contiguous range -- halve it.
    rate = 1
    while hours_needed(rate) > hours:
        rate += 1
    return rate
