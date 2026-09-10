def growth_cost(n, factor=2):
    """Return (resizes, elements_copied) for appending n items.

    The array starts with capacity 0. Each time it is full and another item
    arrives, it allocates a new block, copies everything across, and the new
    capacity is `capacity * factor` — except from 0, where it goes to 1.
    """
    capacity = 0
    size = 0
    resizes = 0
    copied = 0
    for _ in range(n):
        if size == capacity:
            copied += size
            capacity = 1 if capacity == 0 else capacity * factor
            resizes += 1
        size += 1
    return (resizes, copied)
