import cv2
import numpy as np
import base64


# HSV ranges for common climbing hold colors
# Format: list of (lower, upper) tuples — red wraps around 0/180 so it needs two ranges
COLOR_RANGES = {
    # Hue, Saturation, Value ranges for HSV
    'red': ([0, 150, 100], [10, 255, 255]),      # More saturated red
    'red2': ([170, 150, 100], [180, 255, 255]),  # Red wraps around at 180
    'blue': ([100, 120, 80], [130, 255, 255]),   # Tighter blue
    'green': ([40, 80, 60], [80, 255, 255]),     # More saturated green
    'yellow': ([20, 120, 120], [35, 255, 255]),  # MUCH tighter yellow
    'orange': ([10, 150, 150], [20, 255, 255]),  # New orange range
    'purple': ([125, 80, 80], [155, 255, 255]),  # Purple/violet
    'pink': ([150, 100, 100], [170, 255, 255]),  # Hot pink
}


def decode_image(image_b64: str) -> np.ndarray:
    # Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]
    img_bytes = base64.b64decode(image_b64)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image — check base64 encoding")
    return img


def build_mask(hsv: np.ndarray, color: str) -> np.ndarray:
    key = color.lower()
    if key not in COLOR_RANGES and key != "red":
        raise ValueError(f"Unknown color '{color}'. Supported: {[k for k in COLOR_RANGES if k != 'red2']}")

    mask = np.zeros(hsv.shape[:2], dtype=np.uint8)

    def add_range(k):
        entry = COLOR_RANGES.get(k)
        if entry:
            lo, hi = entry
            mask[:] |= cv2.inRange(hsv, np.array(lo), np.array(hi))

    add_range(key)
    if key == "red":
        add_range("red2")  # red wraps around hue 0/180

    return mask


def detect_holds(image_path: str, color: str = "red") -> tuple[list[dict], dict]:
    """Returns (holds, image_info) where image_info contains width/height for the frontend."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
    img_h, img_w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    mask = build_mask(hsv, color)

    # Scale morph kernel relative to image size so it works on any resolution
    kernel_size = max(5, int(min(img_h, img_w) * 0.003))
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Scale area thresholds relative to image size (assumes holds are ~0.3–3% of image area)
    img_area = img_h * img_w
    min_area = img_area * 0.00003
    max_area = img_area * 0.01

    holds = []
    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        if area < min_area or area > max_area:
            continue

        # Circularity check: holds are roughly round, not elongated strips
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter ** 2)
        if circularity < 0.2:  # < 0.2 = very elongated — likely tape or edge artifact
            continue

        M = cv2.moments(cnt)
        if M["m00"] == 0:
            continue

        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        size = int(np.sqrt(area / np.pi))

        holds.append({
            "id": i + 1,
            "x": cx,
            "y": cy,
            "size": max(size, 10),
            "color": color.lower(),
        })

    # Sort bottom-to-top (descending y) so id=1 is the lowest hold
    holds.sort(key=lambda h: -h["y"])
    for idx, h in enumerate(holds):
        h["id"] = idx + 1

    image_info = {"width": img_w, "height": img_h}
    return holds, image_info
