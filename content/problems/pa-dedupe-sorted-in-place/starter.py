def compact_versions(versions):
    """Collapse runs of equal values in place; return the distinct count."""
    # TODO: walk the list with a read index and a write index. The write index
    # only advances when you have decided to keep a value.
    return len(versions)
