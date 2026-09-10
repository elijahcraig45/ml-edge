def evaluate(tokens):
    """Evaluate a postfix expression over integers and + - * operators."""
    stack = []
    for token in tokens:
        if token in ("+", "-", "*"):
            if len(stack) < 2:
                raise ValueError("operator %r has too few operands" % token)
            right = stack.pop()
            left = stack.pop()
            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            else:
                stack.append(left * right)
        else:
            stack.append(int(token))
    if len(stack) != 1:
        raise ValueError("expression left %d values on the stack" % len(stack))
    return stack[0]
