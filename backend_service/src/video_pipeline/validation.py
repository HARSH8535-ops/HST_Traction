"""
Request validation for the video pipeline.
"""

MAX_SCRIPT_LENGTH = 10000


def validate_request(body: dict) -> tuple:
    """
    Validate an incoming video generation request.

    :param body: The parsed JSON request body.
    :return: A tuple of (is_valid: bool, error_response: dict | None).
             On success returns (True, None).
             On failure returns (False, {"error": "..."}).
    """
    if not isinstance(body, dict):
        return False, {"error": "Request body must be a JSON object"}

    if "script" not in body:
        return False, {"error": "Missing required field: 'script'"}

    script = body["script"]

    if not isinstance(script, str):
        return False, {"error": "'script' must be a string"}

    if not script.strip():
        return False, {"error": "'script' must not be empty"}

    if len(script) > MAX_SCRIPT_LENGTH:
        return False, {
            "error": f"'script' exceeds maximum length of {MAX_SCRIPT_LENGTH} characters"
        }

    return True, None
