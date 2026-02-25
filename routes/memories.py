from pathlib import Path
import json
import base64
import threading

from flask import Blueprint, request, jsonify

# Project root (parent of routes/)
ROOT = Path(__file__).resolve().parent.parent
STORAGE_FILE = ROOT / "storage" / "memories.json"
UPLOADS_DIR = ROOT / "uploads"

# Prevent concurrent read-modify-write from corrupting the JSON file
_storage_lock = threading.Lock()

memories_bp = Blueprint("memories", __name__, url_prefix="/memories")


def _load_memories():
    if not STORAGE_FILE.exists():
        return []
    data = ""
    try:
        with open(STORAGE_FILE, "r", encoding="utf-8") as f:
            data = f.read()
        if not data.strip():
            return []
        return json.loads(data)
    except (json.JSONDecodeError, TypeError, ValueError):
        # Empty, corrupted, or "extra data" — use first complete array or []
        if not data:
            return []
        try:
            start = data.find("[")
            if start == -1:
                return []
            depth = 0
            for i in range(start, len(data)):
                if data[i] == "[":
                    depth += 1
                elif data[i] == "]":
                    depth -= 1
                    if depth == 0:
                        return json.loads(data[start : i + 1])
        except Exception:
            pass
        return []


def _save_memories(data):
    STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@memories_bp.route("/all", methods=["GET"])
def get_all():
    """GET /memories/all — return all saved memories."""
    return jsonify(_load_memories())


@memories_bp.route("/add", methods=["POST"])
def add():
    """POST /memories/add — add a memory (JSON: title, desc, date, place, mood, image optional base64)."""
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    desc = (data.get("desc") or "").strip()
    date = (data.get("date") or "").strip()
    place = (data.get("place") or "").strip()
    mood = (data.get("mood") or "Nostalgic").strip()
    image_b64 = data.get("image")

    if not title and not desc:
        return jsonify({"error": "Add a title or description"}), 400

    with _storage_lock:
        memories = _load_memories()
        mem_id = max((m.get("id") or 0 for m in memories), default=0) + 1

        image_path = None
        if image_b64:
            if isinstance(image_b64, str) and image_b64.startswith("data:"):
                header, b64 = image_b64.split(",", 1)
                ext = "jpg"
                if "png" in header:
                    ext = "png"
                elif "gif" in header:
                    ext = "gif"
                elif "webp" in header:
                    ext = "webp"
                try:
                    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
                    path = UPLOADS_DIR / f"{mem_id}.{ext}"
                    path.write_bytes(base64.b64decode(b64))
                    image_path = f"/uploads/{mem_id}.{ext}"
                except Exception:
                    pass

        memory = {
            "id": mem_id,
            "title": title or "Untitled memory",
            "desc": desc,
            "date": date,
            "place": place,
            "mood": mood,
            "image": image_path,
        }
        memories.append(memory)
        _save_memories(memories)
    return jsonify(memory), 201


@memories_bp.route("/<int:mem_id>", methods=["DELETE"])
def delete(mem_id):
    """DELETE /memories/:id — remove a memory and its photo if any."""
    with _storage_lock:
        memories = _load_memories()
        for m in memories:
            if m.get("id") == mem_id:
                memories.remove(m)
                img = m.get("image")
                if img and img.startswith("/uploads/"):
                    filename = img.replace("/uploads/", "")
                    path = UPLOADS_DIR / filename
                    if path.exists():
                        try:
                            path.unlink()
                        except OSError:
                            pass
                _save_memories(memories)
                return jsonify({"ok": True})
    return jsonify({"error": "Memory not found"}), 404
