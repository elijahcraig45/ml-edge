def submasks(mask):
    """Every submask of `mask`, strictly decreasing, ending with 0."""
    out = []
    s = mask
    while True:
        out.append(s)
        if s == 0:
            break
        s = (s - 1) & mask
    return out
