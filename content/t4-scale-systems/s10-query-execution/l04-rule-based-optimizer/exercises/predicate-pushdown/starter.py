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


def push_down(node):
    """Move every filter down until it sits on the scan of its own table."""
    # TODO: this returns the plan untouched, so every filter still runs above
    # the join. Walk the tree, and for each filter, place its predicate as
    # deep as it can legally go.
    return node
