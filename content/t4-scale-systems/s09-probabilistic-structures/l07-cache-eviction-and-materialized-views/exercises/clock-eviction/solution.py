def clock_hits(capacity, requests):
    """Count cache hits under the CLOCK (second-chance) policy."""
    frames = [None] * capacity      # what is in each slot
    referenced = [False] * capacity  # the reference bit for each slot
    slot_of = {}                     # key -> slot index
    hand = 0
    hits = 0

    for key in requests:
        if key in slot_of:
            hits += 1
            referenced[slot_of[key]] = True
            continue
        while referenced[hand]:
            referenced[hand] = False        # spend the second chance
            hand = (hand + 1) % capacity
        if frames[hand] is not None:
            del slot_of[frames[hand]]
        frames[hand] = key
        referenced[hand] = False
        slot_of[key] = hand
        hand = (hand + 1) % capacity

    return hits
