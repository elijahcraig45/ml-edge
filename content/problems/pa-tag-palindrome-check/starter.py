def is_tag_palindrome(text):
    """True if text reads the same both ways, ignoring case and punctuation."""
    left, right = 0, len(text) - 1
    while left < right:
        # TODO: this compares raw characters. Skip anything that is not a letter
        # or a digit, and compare letters without regard to case.
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True
