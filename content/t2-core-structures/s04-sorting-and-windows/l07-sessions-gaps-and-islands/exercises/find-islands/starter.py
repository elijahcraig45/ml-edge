def sessionize(timestamps, max_gap):
    """Group sorted timestamps into sessions; a gap > max_gap starts a new one."""
    # TODO: this puts every event in its own session. Compare each event with the
    # last one you placed, and extend the open session when the gap is small
    # enough.
    return [[t] for t in timestamps]
