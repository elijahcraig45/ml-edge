def shortest_run_to_quota(daily, quota):
    """Length of the shortest run of days totalling at least quota, else 0."""
    if quota <= 0:
        return 0
    best = 0
    # TODO: grow a window on the right until it clears the quota, then trim it
    # from the left for as long as it still clears the quota.
    return best
