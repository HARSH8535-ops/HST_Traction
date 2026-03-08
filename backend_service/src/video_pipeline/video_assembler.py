"""
Video assembler module for stitching scene images into a preview video.

Uses ffmpeg (available in Lambda via a layer or bundled binary) for
image-to-video conversion, transitions, and final encoding.
"""

import os
import subprocess
import shutil


# Path to ffmpeg – use a layer-provided binary or fall back to system PATH
# We use imageio_ffmpeg to get a bundled binary that works without a Lambda layer.
import imageio_ffmpeg
FFMPEG_BIN = os.environ.get('FFMPEG_PATH')
if not FFMPEG_BIN or not os.path.isfile(FFMPEG_BIN):
    try:
        FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        FFMPEG_BIN = shutil.which('ffmpeg') or 'ffmpeg'


def _run_ffmpeg(args: list[str]) -> None:
    """Run an ffmpeg command; raise on failure."""
    cmd = [FFMPEG_BIN] + args
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed (exit {result.returncode}): {result.stderr}"
        )


def assemble_video(image_files: list[str], aspect_ratio: str = '16:9') -> str:
    """
    Create a slideshow video from a list of image files.

    Each image is displayed for 3 seconds by default.

    :param image_files: Ordered list of local image file paths
    :param aspect_ratio: Target aspect ratio (e.g. '16:9', '9:16')
    :return: Path to the assembled MP4 file
    """
    if not image_files:
        raise ValueError("No image files provided for assembly")

    output_path = '/tmp/assembled.mp4'

    # Determine resolution from aspect ratio
    if aspect_ratio == '9:16':
        scale = '1080:1920'
    elif aspect_ratio == '1:1':
        scale = '1080:1080'
    else:
        scale = '1920:1080'

    # Build ffmpeg concat-demuxer input list
    list_file = '/tmp/ffmpeg_inputs.txt'
    with open(list_file, 'w') as f:
        for img in image_files:
            f.write(f"file '{img}'\n")
            f.write("duration 3\n")
        # Repeat last entry so ffmpeg shows the final frame
        f.write(f"file '{image_files[-1]}'\n")

    _run_ffmpeg([
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', list_file,
        '-vf', f'scale={scale}:force_original_aspect_ratio=decrease,pad={scale}:(ow-iw)/2:(oh-ih)/2',
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        output_path,
    ])

    return output_path


def add_transitions(video_path: str) -> str:
    """
    Add simple crossfade transitions between scenes.

    For the initial implementation this is a lightweight pass-through; real
    transitions can be layered via ffmpeg xfade filters in a future iteration.

    :param video_path: Path to the input video
    :return: Path to the video with transitions (may be the same file)
    """
    # Lightweight pass-through for now – a real xfade pipeline can be added later
    return video_path


def encode_video(video_path: str, aspect_ratio: str = '16:9') -> str:
    """
    Re-encode the video with optimal settings for web delivery.

    :param video_path: Path to the input video
    :param aspect_ratio: Target aspect ratio
    :return: Path to the final encoded MP4
    """
    output_path = '/tmp/final.mp4'

    _run_ffmpeg([
        '-y',
        '-i', video_path,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        output_path,
    ])

    return output_path
