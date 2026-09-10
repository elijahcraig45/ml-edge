def distinct_windows(downloaders, k):
    """Count length-k stretches in which no account repeats."""
    if k <= 0 or k > len(downloaders):
        return 0
    found = 0
    # TODO: keep one dict of counts for the current window and slide it, instead
    # of inspecting the window from scratch each time.
    return found
