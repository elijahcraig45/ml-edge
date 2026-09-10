def filter_batches(batches, column, threshold):
    """Yield batches keeping only rows where batch[column][i] > threshold."""
    for batch in batches:
        keep = [i for i, v in enumerate(batch[column]) if v > threshold]
        if not keep:
            continue
        yield {name: [values[i] for i in keep] for name, values in batch.items()}
