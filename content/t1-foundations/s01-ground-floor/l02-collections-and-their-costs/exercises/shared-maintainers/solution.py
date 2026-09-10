def shared_maintainers(handles_a, handles_b):
    """Handles present in both lists, in the order they appear in handles_a."""
    in_b = set(handles_b)
    emitted = set()
    result = []
    for handle in handles_a:
        if handle in in_b and handle not in emitted:
            result.append(handle)
            emitted.add(handle)
    return result
