#!/usr/bin/env python3
"""
End-to-end test script for SageMaker-powered AI endpoints.

Usage:
    python test_endpoints.py <API_GATEWAY_URL>

Example:
    python test_endpoints.py https://abc123.execute-api.us-east-1.amazonaws.com/prod/
"""
import argparse
import base64
import json
import sys
import time

import requests

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _print_result(name: str, passed: bool, elapsed: float, detail: str = ""):
    status = "✅ PASS" if passed else "❌ FAIL"
    msg = f"  {status}  {name} ({elapsed:.1f}s)"
    if detail:
        msg += f"  —  {detail}"
    print(msg)


# ---------------------------------------------------------------------------
# Test Functions
# ---------------------------------------------------------------------------

def test_text_generation(api_url: str) -> bool:
    """Test text generation via /api/bedrock."""
    print("\n🔤 Testing text generation …")
    try:
        start = time.time()
        resp = requests.post(
            f"{api_url}/api/bedrock",
            json={
                "prompt": "Write a brief social media caption about coffee",
                "taskType": "contentAnalysis",
                "systemPrompt": "You are a helpful social media assistant."
            },
            timeout=60
        )
        elapsed = time.time() - start

        if resp.status_code != 200:
            _print_result("Text Generation", False, elapsed, f"HTTP {resp.status_code}")
            return False

        data = resp.json()
        if "result" not in data or len(data["result"]) == 0:
            _print_result("Text Generation", False, elapsed, "Empty result")
            return False

        result_preview = data["result"][:80].replace("\n", " ")
        _print_result("Text Generation", True, elapsed, f'"{result_preview}…"')
        return True
    except Exception as e:
        _print_result("Text Generation", False, 0, str(e))
        return False


def test_image_generation(api_url: str) -> bool:
    """Test image generation via /api/bedrock."""
    print("\n🖼️  Testing image generation …")
    try:
        start = time.time()
        resp = requests.post(
            f"{api_url}/api/bedrock",
            json={
                "prompt": "A serene mountain landscape at sunset",
                "taskType": "imageGeneration"
            },
            timeout=120  # CPU-based image gen is slow
        )
        elapsed = time.time() - start

        if resp.status_code != 200:
            _print_result("Image Generation", False, elapsed, f"HTTP {resp.status_code}")
            return False

        data = resp.json()
        is_image = data.get("isImage") is True
        has_data_uri = data.get("result", "").startswith("data:image/")

        if not is_image or not has_data_uri:
            _print_result("Image Generation", False, elapsed, "Invalid image response")
            return False

        # Decode and check size
        b64_part = data["result"].split("base64,")[1]
        img_bytes = base64.b64decode(b64_part)
        _print_result("Image Generation", True, elapsed, f"{len(img_bytes):,} bytes JPEG")
        return True
    except Exception as e:
        _print_result("Image Generation", False, 0, str(e))
        return False


def test_audio_transcription(api_url: str) -> bool:
    """Test audio transcription via /api/bedrock/audio.

    NOTE: Requires a real audio sample. This test uses a tiny silent WAV
    as a smoke test — the transcription will be empty or very short.
    """
    print("\n🎤 Testing audio transcription …")
    try:
        # Create a minimal valid WAV file (44-byte header + 0 data = silence)
        import struct
        sample_rate = 16000
        num_samples = sample_rate  # 1 second of silence
        bits_per_sample = 16
        num_channels = 1
        data_size = num_samples * num_channels * (bits_per_sample // 8)
        header = struct.pack(
            '<4sI4s4sIHHIIHH4sI',
            b'RIFF', 36 + data_size, b'WAVE',
            b'fmt ', 16, 1, num_channels,
            sample_rate, sample_rate * num_channels * (bits_per_sample // 8),
            num_channels * (bits_per_sample // 8), bits_per_sample,
            b'data', data_size
        )
        audio_bytes = header + b'\x00' * data_size
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')

        start = time.time()
        resp = requests.post(
            f"{api_url}/api/bedrock/audio",
            json={
                "audioBase64": audio_b64,
                "mimeType": "audio/wav"
            },
            timeout=60
        )
        elapsed = time.time() - start

        if resp.status_code != 200:
            _print_result("Audio Transcription", False, elapsed, f"HTTP {resp.status_code}")
            return False

        data = resp.json()
        text = data.get("text", "")
        _print_result("Audio Transcription", True, elapsed,
                       f'Transcribed: "{text[:60]}"' if text else "(empty — silence input)")
        return True
    except Exception as e:
        _print_result("Audio Transcription", False, 0, str(e))
        return False


def test_health_check(api_url: str) -> bool:
    """Test /api/health endpoint."""
    print("\n[+] Testing health check ...")
    try:
        start = time.time()
        resp = requests.get(f"{api_url}/api/health", timeout=10)
        elapsed = time.time() - start
        passed = resp.status_code == 200
        _print_result("Health Check", passed, elapsed)
        return passed
    except Exception as e:
        _print_result("Health Check", False, 0, str(e))
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="End-to-end test for TractionPal AI endpoints")
    parser.add_argument("api_url", help="API Gateway base URL (e.g. https://abc.execute-api.us-east-1.amazonaws.com/prod)")
    parser.add_argument("--skip-image", action="store_true", help="Skip image generation test (slow on serverless)")
    parser.add_argument("--skip-audio", action="store_true", help="Skip audio transcription test")
    args = parser.parse_args()

    api_url = args.api_url.rstrip("/")
    print(f"\n{'='*60}")
    print(f"  TractionPal E2E Test Suite")
    print(f"  API: {api_url}")
    print(f"{'='*60}")

    results = {}

    results["health"] = test_health_check(api_url)
    results["text"] = test_text_generation(api_url)

    if not args.skip_image:
        results["image"] = test_image_generation(api_url)
    else:
        print("\n🖼️  Image generation — SKIPPED")

    if not args.skip_audio:
        results["audio"] = test_audio_transcription(api_url)
    else:
        print("\n🎤 Audio transcription — SKIPPED")

    # Summary
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed

    print(f"\n{'='*60}")
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f", {failed} failed ❌")
    else:
        print(" ✅")
    print(f"{'='*60}\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
