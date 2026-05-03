import base64
import tempfile
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from detect_holds import detect_holds

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"]}})

NVIDIA_AVAILABLE = bool(os.getenv("NVIDIA_API_KEY"))


@app.route("/api/detect-holds", methods=["POST"])
def api_detect_holds():
    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "Missing image field"}), 400

    image_b64 = data["image"]
    color = data.get("color", "red")

    img_bytes = base64.b64decode(image_b64)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(img_bytes)
        tmp_path = tmp.name

    try:
        # Step 1: OpenCV finds candidate holds
        candidates, image_info = detect_holds(tmp_path, color)

        # Step 2: Nemotron validates which candidates are real holds
        method = "opencv"
        if NVIDIA_AVAILABLE and candidates:
            try:
                from nemotron_detect import validate_holds_nemotron
                holds = validate_holds_nemotron(tmp_path, candidates)
                method = "opencv+nemotron"
            except Exception as e:
                print(f"Nemotron validation failed, using OpenCV only: {e}")
                holds = candidates
        else:
            holds = candidates

        return jsonify({"holds": holds, "image_info": image_info, "detection_method": method})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        os.unlink(tmp_path)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "nemotron": NVIDIA_AVAILABLE})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
