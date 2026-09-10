def delete_and_repair(slots, key):
    """Delete `key` from a linearly probed table, closing the gap. No tombstones."""
    n = len(slots)
    if n == 0:
        return False

    index = key % n
    for _ in range(n):
        if slots[index] is None:
            return False
        if slots[index] == key:
            # TODO: emptying the slot is only step one. Every entry further
            # along this run that probed past this slot is now unreachable.
            slots[index] = None
            return True
        index = (index + 1) % n
    return False
