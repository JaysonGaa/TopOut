import requests
import base64
import json
from pathlib import Path

print("Testing OpenCV Hold Detection")
print("=" * 50)

# Load image
image_path = Path("test.jpeg")
with open(image_path, "rb") as img_file:
    image_data = base64.b64encode(img_file.read()).decode('utf-8')

print("Image loaded")

# Test each color separately
colors_to_test = ["red", "blue", "green", "yellow", "purple", "pink"]

all_results = {}

for color in colors_to_test:
    print(f"\n🔍 Testing {color} holds...")
    
    response = requests.post(
        "http://localhost:5000/api/detect-holds",
        json={
            "image": image_data,
            "color": color,
            "use_gemini": False  # Force OpenCV
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        holds = result.get('holds', [])
        method = result.get('detection_method', 'unknown')
        
        print(f" Found {len(holds)} {color} holds (method: {method})")
        all_results[color] = holds
    else:
        print(f" Error: {response.status_code}")
        print(f"   {response.text}")

# Summary
print(f"\n" + "=" * 50)
print(f"SUMMARY")
print(f"=" * 50)

total_holds = 0
for color, holds in all_results.items():
    if holds:
        print(f"{color:10s}: {len(holds):3d} holds")
        total_holds += len(holds)

print(f"\nTotal: {total_holds} holds across all colors")