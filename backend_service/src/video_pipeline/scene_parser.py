"""
Scene parser module for splitting scripts into scenes and generating image prompts.
"""

import re


def parse_script(script: str) -> list[dict]:
    """
    Parse a raw script string into a list of scene dictionaries.

    Splits on common markers like "Scene N:", "INT.", "EXT.", numbered lines,
    or double-newline paragraph breaks.

    :param script: Raw script text
    :return: List of scene dicts with 'scene_number', 'text', and 'duration' keys
    """
    if not script or not script.strip():
        return []

    # Try splitting on "Scene N:" markers first
    scene_pattern = re.compile(
        r'(?:^|\n)\s*(?:scene\s*\d+\s*[:\-]|int\.\s|ext\.\s|\d+\.\s)',
        re.IGNORECASE,
    )

    parts = scene_pattern.split(script)
    # Keep non-empty parts
    parts = [p.strip() for p in parts if p and p.strip()]

    # If the regex didn't split anything useful, fall back to paragraph breaks
    if len(parts) <= 1:
        parts = [p.strip() for p in re.split(r'\n\s*\n', script) if p.strip()]

    scenes = []
    for idx, text in enumerate(parts):
        word_count = len(text.split())
        # Rough estimate: ~2.5 words/sec for narration, minimum 2 seconds
        duration = max(2.0, round(word_count / 2.5, 1))
        scenes.append({
            'scene_number': idx,
            'text': text,
            'duration': duration,
        })

    return scenes


def select_top_scenes(scenes: list[dict], target_duration: float = 15) -> list[dict]:
    """
    Select a subset of scenes whose combined duration fits within *target_duration*.

    Scenes are picked in order from the original list so the narrative stays intact.

    :param scenes: Full list of scene dicts (must have 'duration' key)
    :param target_duration: Maximum total duration in seconds
    :return: Subset of scenes fitting within the target duration
    """
    if not scenes:
        return []

    selected = []
    remaining = target_duration

    for scene in scenes:
        scene_dur = scene.get('duration', 3.0)
        if scene_dur <= remaining:
            selected.append(scene)
            remaining -= scene_dur
        if remaining <= 0:
            break

    # Always include at least the first scene
    if not selected and scenes:
        selected.append(scenes[0])

    return selected


def generate_image_prompt(scene: dict) -> str:
    """
    Create a concise image-generation prompt from a scene dictionary.

    :param scene: Scene dict with at least a 'text' key
    :return: Image-generation prompt string
    """
    text = scene.get('text', '')
    # Truncate very long texts to keep the prompt reasonable
    if len(text) > 300:
        text = text[:300].rsplit(' ', 1)[0] + '...'

    prompt = (
        f"Cinematic still frame, high quality, photorealistic: {text}"
    )
    return prompt
