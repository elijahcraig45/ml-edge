def delete_and_repair(slots, key):
    """Delete `key` from a linearly probed table, closing the gap. No tombstones."""
    n = len(slots)
    if n == 0:
        return False

    hole = -1
    index = key % n
    for _ in range(n):
        if slots[index] is None:
            break
        if slots[index] == key:
            hole = index
            break
        index = (index + 1) % n
    if hole < 0:
        return False

    slots[hole] = None
    probe = hole
    for _ in range(n):
        probe = (probe + 1) % n
        entry = slots[probe]
        if entry is None:
            return True
        home = entry % n
        # Move the entry back only if the hole is cyclically at or after its
        # home slot and at or before where it currently sits.
        if (hole - home) % n <= (probe - home) % n:
            slots[hole] = entry
            slots[probe] = None
            hole = probe
    return True
