def aggregate(child, key, value):
    """SELECT key, sum(value), count(*), count(value) ... GROUP BY key"""
    groups = {}
    for row in child:
        state = groups.setdefault(row[key], {"total": 0, "all": 0, "seen": 0})
        # TODO: a missing value is not a zero. Fix the three counters so they
        # follow SQL's rules rather than Python's.
        state["total"] += row[value] or 0
        state["all"] += 1
        state["seen"] += 1
    for k, state in groups.items():
        yield {
            key: k,
            "total": state["total"],
            "count_all": state["all"],
            "count_value": state["seen"],
        }
