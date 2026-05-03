import base64
import tempfile
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from detect_holds import detect_holds

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})


@app.route("/api/detect-holds", methods=["POST"])
def api_detect_holds():
    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "Missing image field"}), 400

    image_b64 = data["image"]
    color = data.get("color", "red")

    try:
        img_bytes = base64.b64decode(image_b64)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(img_bytes)
            tmp_path = tmp.name

        try:
            holds, image_info = detect_holds(tmp_path, color)
        finally:
            os.unlink(tmp_path)

        return jsonify({"holds": holds, "image_info": image_info, "detection_method": "opencv"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
