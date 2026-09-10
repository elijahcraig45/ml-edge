def rebatch(batches, size):
    """Regroup a stream of ragged batches into batches of `size` rows."""
    # TODO: this passes each input batch through unchanged, so the ragged
    # batches stay ragged. Carry a buffer across input batches and emit
    # full-size ones from it.
    for batch in batches:
        yield batch
