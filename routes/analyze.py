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

ONE_MEMORY_SYSTEM = """You are a warm, emotionally intelligent AI that finds deep meaning in personal memories.
Given one memory (title, when, where, mood, description), return ONLY a valid JSON object — no markdown, no backticks:
{
  "insight": "A 2-3 sentence emotional observation about this specific memory. What does it reveal about this person? What makes this moment special? Be warm, poetic, and personal — not generic."
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


@analyze_bp.route("/one", methods=["POST"])
def analyze_one():
    """POST /analyze/one — send a single memory to Groq, return one insight for the overlay."""
    data = request.get_json() or {}
    memory = data.get("memory")
    if not memory or not isinstance(memory, dict):
        return jsonify({"error": "Missing memory object"}), 400

    title = memory.get("title", "")
    desc = memory.get("desc", "") or memory.get("description", "")
    date = memory.get("date", "") or "unknown"
    place = memory.get("place", "") or "unknown"
    mood = memory.get("mood", "Nostalgic")

    user_content = f"""This is one of my most cherished memories.
Title: "{title}"
When: {date}
Where: {place}
Mood: {mood}
Description: {desc or 'none'}

Look deep into this single memory and return ONLY raw JSON (no markdown) with one key "insight": a 2-3 sentence emotional observation about this specific memory. What does it reveal about this person? Be warm, poetic, and personal."""

    api_key = os.environ.get("GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
    if not api_key or api_key.strip() in ("", "your_key_here"):
        return jsonify(_fallback_insight(mood))

    try:
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=300,
            temperature=0.4,
            messages=[
                {"role": "system", "content": ONE_MEMORY_SYSTEM},
                {"role": "user", "content": user_content},
            ],
        )
        raw = resp.choices[0].message.content or ""
        clean = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        insight = parsed.get("insight", "")
        return jsonify({"insight": insight or _fallback_insight(mood)["insight"]})
    except Exception as e:
        current_app.logger.warning("Groq analyze-one failed: %s", e)
        return jsonify(_fallback_insight(mood))


def _fallback_insight(mood):
    fallbacks = {
        "Peaceful": "There's something about stillness that you seek — and this memory is proof you know how to find it. You didn't need anything extraordinary. Just the right moment, and you were completely present.",
        "Joyful": "Joy like this doesn't happen by accident. You were exactly where you needed to be, with exactly the right people. This memory is a map back to your happiest self.",
        "Nostalgic": "This memory lives in you because part of you knows that moment was rare. You felt it even then — that quiet awareness that something beautiful was happening.",
        "Bittersweet": "The most meaningful memories often carry both joy and ache. This one stayed with you because it mattered — deeply, truly, in a way that changed something in you.",
        "Adventurous": "You were fully alive in this memory. No hesitation, no plan — just you and the moment. This is the version of yourself you return to when you need courage.",
        "Loving": "Love like this is the kind that leaves a mark. This memory isn't just about the people in it — it's about who you become when you're surrounded by them.",
    }
    return {"insight": fallbacks.get(mood, fallbacks["Nostalgic"])}
