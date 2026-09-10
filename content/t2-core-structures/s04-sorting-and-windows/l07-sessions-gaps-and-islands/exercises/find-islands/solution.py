def sessionize(timestamps, max_gap):
    """Group sorted timestamps into sessions; a gap > max_gap starts a new one."""
    sessions = []
    for t in timestamps:
        if sessions and t - sessions[-1][-1] <= max_gap:
            sessions[-1].append(t)
        else:
            sessions.append([t])
    return sessions
