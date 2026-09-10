def oldest_first(records):
    """Reverse a newest-first sequence into an oldest-first list."""
    out = []
    for record in records:
        out.append(record)
    out.reverse()
    return out
