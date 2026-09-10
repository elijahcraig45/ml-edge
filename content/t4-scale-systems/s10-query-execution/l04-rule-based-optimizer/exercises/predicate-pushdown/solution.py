def scan(table):
    return {"op": "scan", "table": table}


def filter_(predicate, child):
    return {"op": "filter", "predicate": predicate, "child": child}


def project(columns, child):
    return {"op": "project", "columns": columns, "child": child}


def join(left, right):
    return {"op": "join", "left": left, "right": right}


def pred(table, column, op, value):
    return {"table": table, "column": column, "op": op, "value": value}


def tables(node):
    """The set of base tables read anywhere in this subtree."""
    if node["op"] == "scan":
        return {node["table"]}
    if node["op"] == "join":
        return tables(node["left"]) | tables(node["right"])
    return tables(node["child"])


def place(predicate, node):
    """Insert `predicate` as deep into an already-rewritten subtree as it goes."""
    if node["op"] == "scan":
        return filter_(predicate, node)
    if node["op"] == "project":
        return project(list(node["columns"]), place(predicate, node["child"]))
    if node["op"] == "filter":
        return filter_(node["predicate"], place(predicate, node["child"]))
    if predicate["table"] in tables(node["left"]):
        return join(place(predicate, node["left"]), node["right"])
    if predicate["table"] in tables(node["right"]):
        return join(node["left"], place(predicate, node["right"]))
    return filter_(predicate, node)


def push_down(node):
    """Move every filter down until it sits on the scan of its own table."""
    if node["op"] == "scan":
        return dict(node)
    if node["op"] == "join":
        return join(push_down(node["left"]), push_down(node["right"]))
    if node["op"] == "project":
        return project(list(node["columns"]), push_down(node["child"]))
    return place(node["predicate"], push_down(node["child"]))
