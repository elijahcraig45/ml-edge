def submasks(mask):
    """Every submask of `mask`, strictly decreasing, ending with 0."""
    # TODO: walking every integer from mask down to 0 is 2**bits work when the
    # answer only has 2**popcount(mask) entries -- and `candidate` below is not
    # allowed anyway. Find the next submask directly from the current one.
    out = []
    candidate = mask
    while candidate >= 0:
        out.append(candidate)
        candidate -= 1
    return out
