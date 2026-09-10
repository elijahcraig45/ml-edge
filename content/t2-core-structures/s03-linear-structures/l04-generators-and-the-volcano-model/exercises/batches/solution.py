def batches(source, size):
    """Yield lists of up to `size` consecutive items from `source`.

    Lazy: pulls exactly `size` items from `source` before yielding each batch,
    and nothing more until the caller asks for the next one.
    """
    if size < 1:
        raise ValueError("size must be at least 1")
    batch = []
    for item in source:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch
