# memory-capsule
**Memory Capsule** — An AI-powered app that analyzes your saved memories to reveal hidden patterns in your happiest moments. Add memories, upload photos, and let Claude tell you what truly makes you happy.

## Run the app

From the project root:

```bash
pip install -r backend/requirements.txt
export ANTHROPIC_API_KEY=your_key_here   # or set in backend/.env
flask --app backend.app run
```

Then open http://127.0.0.1:5000
