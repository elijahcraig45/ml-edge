def top_tags(tags, k):
    """The k most frequent tags, most frequent first, ties alphabetical."""
    if k <= 0:
        return []
    counts = {}
    # TODO: count each tag, then rank by count descending with names breaking
    # ties in ascending order.
    return list(counts)[:k]
