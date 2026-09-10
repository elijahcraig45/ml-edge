def agents_needed(jobs):
    """Smallest number of agents that can run every job."""
    if not jobs:
        return 0
    best = 0
    # TODO: the answer is the peak number of jobs in flight. Sort the start
    # times and the end times separately, then sweep the two together.
    return best
