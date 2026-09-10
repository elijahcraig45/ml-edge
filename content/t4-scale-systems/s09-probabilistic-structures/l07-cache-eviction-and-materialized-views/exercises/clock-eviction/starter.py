def clock_hits(capacity, requests):
    """Count cache hits under the CLOCK (second-chance) policy.

    This is plain FIFO: it evicts whatever the hand points at, with no second
    chance. Add the reference bits.
    """
    frames = [None] * capacity      # what is in each slot
    referenced = [False] * capacity  # the reference bit for each slot
    slot_of = {}                     # key -> slot index
    hand = 0
    hits = 0

    for key in requests:
        if key in slot_of:
            hits += 1
            # TODO: a hit must set this slot's reference bit.
            continue
        # TODO: before evicting, sweep forward over slots whose reference bit is
        # set, clearing each one as you pass it. Evict the first slot you reach
        # with a clear bit.
        if frames[hand] is not None:
            del slot_of[frames[hand]]
        frames[hand] = key
        referenced[hand] = False
        slot_of[key] = hand
        hand = (hand + 1) % capacity

    return hits
