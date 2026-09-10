def compact_versions(versions):
    """Collapse runs of equal values in place; return the distinct count."""
    if not versions:
        return 0
    write = 1
    for read in range(1, len(versions)):
        if versions[read] != versions[write - 1]:
            versions[write] = versions[read]
            write += 1
    return write
