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
