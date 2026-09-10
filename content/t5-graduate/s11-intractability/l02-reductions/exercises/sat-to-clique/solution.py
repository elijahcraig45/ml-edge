def sat_to_clique(clauses):
    """3-CNF -> (num_vertices, edges, k). Vertex 3*i + a is literal a of clause i."""
    m = len(clauses)
    edges = set()
    for i in range(m):
        for j in range(i + 1, m):
            for a in range(3):
                for b in range(3):
                    if clauses[i][a] != -clauses[j][b]:
                        edges.add((3 * i + a, 3 * j + b))
    return 3 * m, edges, m


def assignment_to_clique(clauses, assignment):
    """Turn a satisfying assignment into a clique of size len(clauses)."""
    chosen = set()
    for i, clause in enumerate(clauses):
        for a, lit in enumerate(clause):
            value = assignment[abs(lit)] if lit > 0 else not assignment[abs(lit)]
            if value:
                chosen.add(3 * i + a)
                break
    return chosen
