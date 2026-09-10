def aggregate(child, key, value):
    """SELECT key, sum(value), count(*), count(value) ... GROUP BY key"""
    groups = {}
    for row in child:
        state = groups.setdefault(row[key], {"total": None, "all": 0, "seen": 0})
        state["all"] += 1
        v = row[value]
        if v is not None:
            state["total"] = v if state["total"] is None else state["total"] + v
            state["seen"] += 1
    for k, state in groups.items():
        yield {
            key: k,
            "total": state["total"],
            "count_all": state["all"],
            "count_value": state["seen"],
        }
