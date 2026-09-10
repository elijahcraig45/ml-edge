def filter_batches(batches, column, threshold):
    """Yield batches keeping only rows where batch[column][i] > threshold."""
    for batch in batches:
        # TODO: this filters each column against its own values, which loses
        # track of which row a value belonged to. Decide which positions
        # survive once, then apply those positions to every column.
        yield {
            name: [v for v in values if v > threshold]
            for name, values in batch.items()
        }
