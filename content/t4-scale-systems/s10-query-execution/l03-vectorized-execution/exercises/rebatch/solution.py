def rebatch(batches, size):
    """Regroup a stream of ragged batches into batches of `size` rows."""
    buffer = None
    for batch in batches:
        if buffer is None:
            buffer = {name: list(values) for name, values in batch.items()}
        else:
            for name, values in batch.items():
                buffer[name].extend(values)
        while len(next(iter(buffer.values()), [])) >= size:
            yield {name: values[:size] for name, values in buffer.items()}
            buffer = {name: values[size:] for name, values in buffer.items()}
    if buffer and len(next(iter(buffer.values()))) > 0:
        yield buffer
