def oldest_first(records):
    """Reverse a newest-first sequence into an oldest-first list."""
    out = []
    for record in records:
        # TODO: correct, but every insert at index 0 shifts the whole list.
        # Build the list the cheap way, then fix the order once at the end.
        out.insert(0, record)
    return out
