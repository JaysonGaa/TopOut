"""
Run the full OpenCV + Nemotron detection pipeline on a test image.
Tests ALL colors automatically.

Usage (from backend/ directory):
    venv\Scripts\python test\test_detection.py
    venv\Scripts\python test\test_detection.py test\test2.jpeg
"""

import sys
import os
import time

# Find backend directory (parent of test/ folder)
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Make sure backend/ modules are importable
sys.path.insert(0, backend_dir)

from detect_holds import detect_holds
from dotenv import load_dotenv

# Load .env from backend directory
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

NVIDIA_AVAILABLE = bool(os.getenv("NVIDIA_API_KEY"))

# Debug: show where we're looking for .env
if not NVIDIA_AVAILABLE:
    print(f"DEBUG: Looking for .env at: {env_path}")
    print(f"DEBUG: File exists: {os.path.exists(env_path)}")

IMAGE = sys.argv[1] if len(sys.argv) > 1 else "test.jpeg"

# All colors to test
COLORS = ["red", "blue", "green", "yellow", "orange", "purple", "pink"]

print(f"Image : {IMAGE}")
print(f"Nemotron : {'enabled' if NVIDIA_AVAILABLE else 'disabled (no NVIDIA_API_KEY)'}")
print("=" * 60)

all_holds = []
color_summary = {}

for color in COLORS:
    print(f"\n🔍 Testing {color.upper()} holds...")
    print("-" * 60)
    
    # ── Step 1: OpenCV ────────────────────────────────────
    t0 = time.time()
    try:
        candidates, image_info = detect_holds(IMAGE, color)
        opencv_time = time.time() - t0
        
        if len(candidates) == 0:
            print(f"[OpenCV]  No {color} holds found")
            continue
        
        print(f"[OpenCV]  {len(candidates)} candidates  ({opencv_time:.2f}s)")
        
        # Show first 5 candidates
        for h in candidates[:5]:
            print(f"          #{h['id']:2d}  ({h['x']:4d}, {h['y']:4d})  size={h['size']}")
        if len(candidates) > 5:
            print(f"          ... and {len(candidates) - 5} more")
        
        # ── Step 2: Nemotron validation ───────────────────────
        if NVIDIA_AVAILABLE and candidates:
            print(f"[Nemotron] Validating {color} holds...")
            from nemotron_detect import validate_holds_nemotron
            t1 = time.time()
            holds = validate_holds_nemotron(IMAGE, candidates)
            nemotron_time = time.time() - t1
            
            removed = [h for h in candidates if h["id"] not in {x["id"] for x in holds}]
            
            print(f"[Nemotron] {len(candidates)} -> {len(holds)} holds  ({nemotron_time:.2f}s)")
            if removed:
                print(f"           Removed {len(removed)} false positives")
        else:
            holds = candidates
        
        # Add to master list
        all_holds.extend(holds)
        color_summary[color] = len(holds)
        
    except Exception as e:
        print(f"❌ Error processing {color}: {e}")
        continue

# ── Final Summary ──────────────────────────────────────
print()
print("=" * 60)
print("📊 FINAL SUMMARY")
print("=" * 60)

if image_info:
    print(f"Image size: {image_info['width']}x{image_info['height']}px")

print(f"\n🎨 Holds by Color:")
total_holds = 0
for color in COLORS:
    count = color_summary.get(color, 0)
    if count > 0:
        print(f"   {color:10s}: {count:3d} holds")
        total_holds += count

print(f"\n   {'TOTAL':10s}: {total_holds:3d} holds")

# Show all holds
if all_holds:
    print(f"\n📍 All Detected Holds ({len(all_holds)} total):")
    
    # Sort by y-coordinate (bottom to top)
    all_holds_sorted = sorted(all_holds, key=lambda h: -h['y'])
    
    # Reassign IDs
    for i, h in enumerate(all_holds_sorted, 1):
        h['id'] = i
    
    # Show first 20
    for h in all_holds_sorted[:20]:
        print(f"   #{h['id']:3d}  {h['color']:8s}  ({h['x']:4d}, {h['y']:4d})  size={h['size']}")
    
    if len(all_holds_sorted) > 20:
        print(f"   ... and {len(all_holds_sorted) - 20} more")

print()
print("=" * 60)