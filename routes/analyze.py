from pathlib import Path
import json
import os

from flask import Blueprint, current_app, jsonify
from groq import Groq

# Project root
ROOT = Path(__file__).resolve().parent.parent
STORAGE_FILE = ROOT / "storage" / "memories.json"

analyze_bp = Blueprint("analyze", __name__, url_prefix="/analyze")

SYSTEM_PROMPT = """You analyze a person's saved memories and find deep emotional patterns.
Answer ONE question: "What pattern do you see in this person's happiest moments?"

Return ONLY a valid JSON object — no markdown, no backticks, no explanation:
{
  "insights": [
    { "icon": "emoji", "label": "short label", "value": "1-2 sentence insight" },
    { "icon": "emoji", "label": "short label", "value": "1-2 sentence insight" },
    { "icon": "emoji", "label": "short label", "value": "1-2 sentence insight" },
    { "icon": "emoji", "label": "short label", "value": "1-2 sentence insight" }
  ],
  "bigPicture": "2-3 sentences about the overall pattern. What truly brings this person happiness? Be specific, emotional, insightful. Surface patterns a human would not easily see (e.g. '7 of 10 memories involve family', 'you feel happiest in quiet moments, not celebrations', 'water appears in most peaceful memories').",
  "message": "A warm, personal message to this person based on their memories. Like a letter from someone who knows them deeply. 2-3 sentences. Make it feel like a gentle revelation."
}"""

FALLBACK = {
    "insights": [
        {"icon": "🌊", "label": "Where you feel free", "value": "Most of your happiest moments happen near water or open spaces — the sea, the road, a window. You need openness to feel alive."},
        {"icon": "👥", "label": "Who matters most", "value": "Your best memories almost always involve family — especially quiet moments with them, not big events."},
        {"icon": "🌅", "label": "When magic happens", "value": "You're drawn to early mornings and late nights — the edges of the day when the world is quiet and belongs to you."},
        {"icon": "🤫", "label": "What you overlook", "value": "Some of your deepest memories are ordinary moments. You find meaning in stillness, not just in milestones."},
    ],
    "bigPicture": "You are someone who finds joy not in loud celebrations, but in quiet presence — the smell of coffee, the sound of someone you love, the feeling of being exactly where you're supposed to be. Your happiest self is unhurried.",
    "message": "You've been collecting proof of a beautiful life without even realizing it. These memories aren't random — they're telling you something. The things that made you feel most alive? You can have more of them. You know what they are now.",
}


def _load_memories():
    if not STORAGE_FILE.exists():
        return []
    try:
        with open(STORAGE_FILE, "r", encoding="utf-8") as f:
            data = f.read()
        if not data.strip():
            return []
        return json.loads(data)
    except (json.JSONDecodeError, TypeError, ValueError):
        return []


@analyze_bp.route("", methods=["POST"])
def analyze():
    """POST /analyze — send ALL memories to Groq, get pattern analysis, return insights."""
    memories = _load_memories()
    if len(memories) < 2:
        return jsonify({"error": "Add at least 2 memories first"}), 400

    memories_text = "\n".join(
        f'Memory {i+1}: "{m.get("title", "")}" | {m.get("mood", "")} | {m.get("place") or "unknown"} | {m.get("date") or "unknown"} | {m.get("desc", "")}'
        for i, m in enumerate(memories)
    )
    user_content = f"Here are my memories:\n{memories_text}\n\nAnalyze my patterns. What do you see?"

    api_key = os.environ.get("GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
    if not api_key or api_key.strip() in ("", "your_key_here"):
        return jsonify(FALLBACK)

    try:
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1000,
            temperature=0.3,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
        raw = resp.choices[0].message.content or ""
        clean = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)
        return jsonify(data)
    except Exception as e:
        current_app.logger.warning("Groq request failed: %s", e)
        return jsonify(FALLBACK)
