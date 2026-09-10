def limit(child, n):
    """Yield the first n rows from child, pulling no more than n of them."""
    # TODO: this returns the right rows and reads the whole child to do it.
    # Make it lazy: pull at most n rows, and pull nothing before you are asked.
    return iter(list(child)[:n])
