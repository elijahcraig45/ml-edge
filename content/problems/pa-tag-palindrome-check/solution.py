def is_tag_palindrome(text):
    """True if text reads the same both ways, ignoring case and punctuation."""
    left, right = 0, len(text) - 1
    while left < right:
        if not text[left].isalnum():
            left += 1
            continue
        if not text[right].isalnum():
            right -= 1
            continue
        if text[left].lower() != text[right].lower():
            return False
        left += 1
        right -= 1
    return True
