def first_duplicate(tags):
    """Return the first tag that occurs twice, or None if all are unique."""
    seen = set()
    for tag in tags:
        if tag in seen:
            return tag
        seen.add(tag)
    return None
