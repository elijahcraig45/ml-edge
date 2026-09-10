def shared_maintainers(handles_a, handles_b):
    """Handles present in both lists, in the order they appear in handles_a."""
    result = []
    for handle in handles_a:
        # TODO: this works, but `handle in handles_b` scans handles_b every time.
        # Build something once, before the loop, that answers membership instantly.
        if handle in handles_b and handle not in result:
            result.append(handle)
    return result
