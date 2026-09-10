def batches(source, size):
    """Yield lists of up to `size` consecutive items from `source`.

    Lazy: pulls exactly `size` items from `source` before yielding each batch,
    and nothing more until the caller asks for the next one.
    """
    if size < 1:
        raise ValueError("size must be at least 1")
    # TODO: this drains the whole source before returning anything, so it
    # cannot be used on an endless stream and it holds every item in memory.
    # Turn it into a generator that yields each batch as soon as it is full.
    items = list(source)
    out = []
    for start in range(0, len(items), size):
        out.append(items[start:start + size])
    return out
