# memory-capsule

**Memory Capsule** — An AI-powered app that analyzes your saved memories to reveal hidden patterns in your happiest moments. Add memories, upload photos, and let AI show you what truly makes you happy.

## How it works

- **Backend** is the middleman: **Browser → Flask → Groq API → back to you.**
- It saves memories to a JSON file (title, desc, date, place, mood, photo), loads them for the UI, and when you click **"Find my pattern"** it sends **all** your memories to Groq in one prompt.
- **Groq** answers one question: *"What pattern do you see in this person's happiest moments?"* and returns things that are hard to see yourself, e.g.:
  - "7 of your 10 memories involve family — never strangers"
  - "You feel happiest in quiet moments, not celebrations"
  - "Water appears in 60% of your peaceful memories"
  - "Your joy comes from creating or discovering — never from receiving"
- **Without AI** you only have a list. **With AI** you get self-knowledge from patterns across 10, 20, 50 memories. That’s the point of the app.

## Run the app

From the project root:

```bash
pip install -r backend/requirements.txt
export GROQ_API_KEY=your_key_here   # or set in backend/.env
flask --app backend.app run
```

Then open http://127.0.0.1:5000

---

## Deploy on Render

Deploy the **entire project** (frontend + API) as one Web Service on [Render](https://render.com).

### One-click (Blueprint)

1. Push this repo to GitHub.
2. In [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo; Render will read `render.yaml`.
4. Add env var **GROQ_API_KEY** (Dashboard → your service → Environment).
5. Deploy. Your app will be at `https://memory-capsule-xxxx.onrender.com`.

### Manual

1. **New** → **Web Service**; connect your GitHub repo.
2. **Runtime**: Python.
3. **Build command**: `pip install -r backend/requirements.txt`
4. **Start command**: `gunicorn backend.app:app --bind 0.0.0.0:$PORT`
5. **Environment**: add `GROQ_API_KEY` with your Groq API key.
6. Deploy.

### Notes

- **Root directory** stays empty so the repo root is used (backend, routes, frontend, storage, uploads all live there).
- On the free tier, the filesystem is **ephemeral**: memories and uploads are lost on deploy or restart. For persistence, use a **persistent disk**: add a disk in Render, mount it at `/data`, and set env var `DATA_DIR=/data` (see optional support in the app).
