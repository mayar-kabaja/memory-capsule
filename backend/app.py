from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

from flask import Flask, send_from_directory
from flask_cors import CORS

from routes.memories import memories_bp
from routes.analyze import analyze_bp

app = Flask(__name__)
CORS(app, supports_credentials=True)

app.register_blueprint(memories_bp)
app.register_blueprint(analyze_bp)

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"
UPLOADS_DIR = ROOT / "uploads"


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(UPLOADS_DIR, filename)


@app.route("/<path:path>")
def frontend_static(path):
    return send_from_directory(FRONTEND_DIR, path)
