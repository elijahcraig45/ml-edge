def longest_build_run(builds):
    """Length of the longest run of consecutive build numbers present."""
    present = set(builds)
    best = 0
    # TODO: only count upwards from a build that starts a run -- one whose
    # predecessor is missing. Counting from every build re-walks the same run.
    return best
