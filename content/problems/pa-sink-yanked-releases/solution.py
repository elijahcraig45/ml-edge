def sink_yanked(names):
    """Move every None to the end in place, keeping the rest in order."""
    write = 0
    for read in range(len(names)):
        if names[read] is not None:
            names[write], names[read] = names[read], names[write]
            write += 1
