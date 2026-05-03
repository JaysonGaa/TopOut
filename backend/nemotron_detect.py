import os
import json
import re
import base64
import tempfile
import cv2
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
VISION_MODEL = "meta/llama-3.2-90b-vision-instruct"

_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key:
            raise RuntimeError("NVIDIA_API_KEY not set in .env")
        _client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=api_key)
    return _client


def _encode_image(img: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf).decode("utf-8")


def _parse_id_list(text: str) -> list[int]:
    """Extract a list of integers from any response format."""
    # Try JSON array first
    match = re.search(r"\[[\d,\s]+\]", text)
    if match:
        try:
            return [int(x) for x in json.loads(match.group(0))]
        except (json.JSONDecodeError, ValueError):
            pass
    # Fall back to finding all numbers in the text
    return [int(n) for n in re.findall(r"\b(\d+)\b", text)]


def _annotate_image(img: np.ndarray, candidates: list[dict]) -> np.ndarray:
    """Draw numbered circles on the image for each candidate hold."""
    annotated = img.copy()
    for h in candidates:
        cx, cy, r = h["x"], h["y"], max(h["size"], 15)
        cv2.circle(annotated, (cx, cy), r, (0, 255, 255), 2)
        # White filled circle behind label for readability
        label = str(h["id"])
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = max(0.4, r / 35)
        thickness = max(1, int(scale * 2))
        (tw, th), _ = cv2.getTextSize(label, font, scale, thickness)
        cv2.circle(annotated, (cx, cy - r - 10), max(tw, th) // 2 + 6, (0, 0, 0), -1)
        cv2.putText(annotated, label, (cx - tw // 2, cy - r - 10 + th // 2),
                    font, scale, (0, 255, 255), thickness)
    return annotated


def validate_holds_nemotron(image_path: str, candidates: list[dict]) -> list[dict]:
    """
    Send an annotated image to Nemotron and ask it which numbered candidates
    are real climbing holds. Returns the filtered hold list.
    """
    if not candidates:
        return candidates

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    # Resize for API if very large (keeps cost/latency down)
    h, w = img.shape[:2]
    max_dim = 1024
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
        # Scale candidate coordinates to match resized image
        scaled = []
        for c in candidates:
            scaled.append({**c, "x": int(c["x"] * scale), "y": int(c["y"] * scale),
                            "size": int(c["size"] * scale)})
        candidates_for_annotation = scaled
    else:
        candidates_for_annotation = candidates

    annotated = _annotate_image(img, candidates_for_annotation)
    b64 = _encode_image(annotated)

    ids = [str(c["id"]) for c in candidates]
    prompt = f"""This is a climbing wall photo. Numbered circles mark blobs detected by a color-detection algorithm.

Candidate hold numbers: {', '.join(ids)}

Your job: look at each numbered circle and decide if it is marking an actual climbing hold (a colored plastic or resin grip bolted to the wall).

Reject a number if the circle is on:
- Wall texture, paint, or background
- Tape or chalk marks
- Lighting glare or shadows
- Anything that is clearly NOT a physical hold

Reply with ONLY a JSON array of the hold numbers that ARE real climbing holds.
Example: [1, 3, 5, 7]

If none are real holds, reply: []"""

    client = get_client()
    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            ],
        }],
        temperature=0.1,
        max_tokens=256,
    )

    raw = response.choices[0].message.content.strip()
    print(f"[Nemotron validation] {raw}")

    valid_ids = set(_parse_id_list(raw))
    # If Nemotron returned nothing sensible, keep all candidates
    if not valid_ids:
        print("[Nemotron validation] No valid IDs parsed — keeping all OpenCV results")
        return candidates

    filtered = [h for h in candidates if h["id"] in valid_ids]
    print(f"[Nemotron validation] {len(candidates)} -> {len(filtered)} holds after filtering")
    return filtered
