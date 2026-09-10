PACKAGES = [
    {"id": 1, "name": "arrowkit", "language": "python", "created_at": "2019-03-11"},
    {"id": 2, "name": "bitmask",  "language": "rust",   "created_at": "2020-07-02"},
    {"id": 3, "name": "chunker",  "language": "python", "created_at": "2018-01-24"},
    {"id": 4, "name": "dagrun",   "language": "python", "created_at": "2021-11-05"},
    {"id": 5, "name": "edgecase", "language": "js",     "created_at": "2017-06-30"},
]


def scan(rows):
    for row in rows:
        yield row


def filter_op(child, predicate):
    for row in child:
        if predicate(row):
            yield row


def project(child, columns):
    for row in child:
        yield {c: row[c] for c in columns}


def limit(child, n):
    if n <= 0:
        return
    taken = 0
    for row in child:
        yield row
        taken += 1
        if taken >= n:
            return


def plan(rows, language, n):
    """SELECT name, created_at FROM rows WHERE language = ? LIMIT ?"""
    # TODO: compose scan / filter_op / project / limit and return the iterator.
    # This version is correct and reads the entire stream first.
    return [
        {"name": r["name"], "created_at": r["created_at"]}
        for r in rows
        if r["language"] == language
    ][:n]
