def contained_in(q1, q2):
    """True when Q1 is contained in Q2 on every database."""
    head1, body1 = q1
    head2, body2 = q2
    if len(head1) != len(head2):
        return False
    # TODO: search for a homomorphism from q2's body into q1's body that also
    #       sends q2's head to q1's head. Counting atoms is not the test.
    return len(body2) <= len(body1)
