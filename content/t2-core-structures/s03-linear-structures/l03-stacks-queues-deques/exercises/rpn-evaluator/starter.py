def evaluate(tokens):
    """Evaluate a postfix expression over integers and + - * operators."""
    stack = []
    for token in tokens:
        if token in ("+", "-", "*"):
            # TODO: two problems here.
            #   1. pop() returns the operand pushed LAST, which is the one on
            #      the right of the operator. Name the two operands correctly.
            #   2. nothing checks that there are two operands to pop, or that
            #      exactly one value is left at the end.
            left = stack.pop()
            right = stack.pop()
            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            else:
                stack.append(left * right)
        else:
            stack.append(int(token))
    return stack[0]
