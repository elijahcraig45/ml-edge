def top_tags(tags, k):
    """The k most frequent tags, most frequent first, ties alphabetical."""
    if k <= 0:
        return []
    counts = {}
    for tag in tags:
        counts[tag] = counts.get(tag, 0) + 1
    ranked = sorted(counts, key=lambda tag: (-counts[tag], tag))
    return ranked[:k]
