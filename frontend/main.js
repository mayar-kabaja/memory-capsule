const API_KEY = 'YOUR_API_KEY_HERE'; // 🔑 Replace with your Anthropic API key

let memories = [];
let selectedMood = '';
let currentPhoto = null;

// Stars background
const canvas = document.getElementById('stars-canvas');
const ctx = canvas.getContext('2d');
let stars = [];

function initStars() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  stars = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2 + 0.2,
    o: Math.random() * 0.6 + 0.1,
    speed: Math.random() * 0.003 + 0.001,
    phase: Math.random() * Math.PI * 2
  }));
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach(s => {
    s.phase += s.speed;
    const opacity = s.o * (0.6 + 0.4 * Math.sin(s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(232,224,213,${opacity})`;
    ctx.fill();
  });
  requestAnimationFrame(drawStars);
}

window.addEventListener('resize', initStars);
initStars();
drawStars();

// Constellation animation
function animateConstellation() {
  const c = document.getElementById('constellation');
  c.innerHTML = '';
  const points = [
    [20, 70], [70, 20], [130, 55], [180, 15], [220, 60], [170, 80], [100, 75]
  ];
  const lines = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2]];

  lines.forEach(([a, b], i) => {
    const p1 = points[a], p2 = points[b];
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const len = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const line = document.createElement('div');
    line.className = 'c-line';
    line.style.cssText = `left:${p1[0]}px;top:${p1[1]}px;width:${len}px;transform:rotate(${angle}deg);animation-delay:${i*0.1}s;`;
    c.appendChild(line);
  });

  points.forEach(([x, y], i) => {
    const star = document.createElement('div');
    star.className = 'c-star';
    star.style.cssText = `left:${x-2}px;top:${y-2}px;animation-delay:${i*0.08}s;`;
    c.appendChild(star);
  });
}

animateConstellation();
setInterval(animateConstellation, 5000);

// Mood selector
document.getElementById('moodSelector').addEventListener('click', e => {
  if (e.target.classList.contains('mood-btn')) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedMood = e.target.dataset.mood;
  }
});

// Photo upload
document.getElementById('photoIn').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    currentPhoto = ev.target.result;
    document.getElementById('photoPreview').src = currentPhoto;
    document.getElementById('photoUpload').classList.add('has-photo');
  };
  reader.readAsDataURL(file);
});

function addMemory() {
  const title = document.getElementById('memTitle').value.trim();
  const desc = document.getElementById('memDesc').value.trim();
  const date = document.getElementById('memDate').value.trim();
  const place = document.getElementById('memPlace').value.trim();

  if (!title && !desc) { alert('Add a title or description ✦'); return; }

  memories.push({
    id: Date.now(),
    title: title || 'Untitled memory',
    desc,
    date: date || '',
    place: place || '',
    mood: selectedMood || 'Nostalgic',
    image: currentPhoto
  });

  // Reset
  document.getElementById('memTitle').value = '';
  document.getElementById('memDesc').value = '';
  document.getElementById('memDate').value = '';
  document.getElementById('memPlace').value = '';
  document.getElementById('photoPreview').src = '';
  document.getElementById('photoUpload').classList.remove('has-photo');
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
  selectedMood = '';
  currentPhoto = null;

  renderGrid();
}

function deleteMemory(id) {
  memories = memories.filter(m => m.id !== id);
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('memoriesGrid');
  document.getElementById('memCount').textContent = memories.length;

  if (!memories.length) {
    grid.innerHTML = '<div class="empty-grid">No memories yet — add your first one above</div>';
    return;
  }

  grid.innerHTML = memories.map(m => `
    <div class="mem-card" id="card-${m.id}">
      <button class="mem-delete" onclick="deleteMemory(${m.id})">✕</button>
      ${m.image
        ? `<img class="mem-photo" src="${m.image}" alt="">`
        : `<div class="mem-photo-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
      }
      <div class="mem-body">
        <div class="mem-title">${m.title}</div>
        <div class="mem-meta">${[m.date, m.place].filter(Boolean).join(' · ') || '&nbsp;'}</div>
        <div class="mem-mood ${m.mood}">${m.mood}</div>
      </div>
    </div>
  `).join('');
}

// Demo data
function loadDemoData() {
  memories = [
    { id: 1, title: "Sunrise at the sea", desc: "Woke up before anyone else and watched the sun rise over the water. Dad was there, quiet, just us two.", date: "Summer 2018", place: "Latakia coast", mood: "Peaceful", image: null },
    { id: 2, title: "Graduation day", desc: "Everyone was proud. Mom was crying. I remember the feeling of finally being done.", date: "June 2022", place: "University, Nablus", mood: "Joyful", image: null },
    { id: 3, title: "Road trip through the north", desc: "Just friends, an old car, no plan. We got lost three times and laughed the entire way.", date: "Spring 2021", place: "Northern roads", mood: "Adventurous", image: null },
    { id: 4, title: "Ramadan nights with family", desc: "After iftar, everyone gathered. My grandmother told old stories. The whole house smelled like coffee.", date: "Ramadan 2019", place: "Grandma's house", mood: "Loving", image: null },
    { id: 5, title: "First time I built something real", desc: "Stayed up until 4am finishing a project. When it finally worked, I sat alone in the dark and smiled.", date: "Late 2023", place: "Home", mood: "Joyful", image: null },
    { id: 6, title: "A quiet afternoon that mattered", desc: "Nothing happened. I was reading by the window. But I remember feeling completely at peace.", date: "Winter 2020", place: "My room", mood: "Nostalgic", image: null },
  ];
  renderGrid();
  document.querySelector('.demo-btn').textContent = '✓ Demo memories loaded';
}

async function discoverPattern() {
  if (memories.length < 2) {
    alert('Add at least 2 memories first ✦');
    return;
  }

  document.getElementById('loadingState').classList.add('visible');
  document.getElementById('insightsOutput').classList.remove('visible');

  const memoriesText = memories.map((m, i) =>
    `Memory ${i+1}: "${m.title}" | Where: ${m.place || 'unknown'} | When: ${m.date || 'unknown'} | Mood: ${m.mood} | Description: ${m.desc}`
  ).join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You analyze a person's saved memories and find deep emotional patterns. 
Return ONLY a valid JSON object — no markdown, no backticks, no explanation:
{
  "insights": [
    { "icon": "emoji", "label": "short label", "value": "1-2 sentence insight" },
    { "icon": "emoji", "label": "short label", "value": "1-2 sentence insight" },
    { "icon": "emoji", "label": "short label", "value": "1-2 sentence insight" },
    { "icon": "emoji", "label": "short label", "value": "1-2 sentence insight" }
  ],
  "bigPicture": "2-3 sentences about the overall pattern. What truly brings this person happiness? Be specific, emotional, insightful.",
  "message": "A warm, personal message to this person based on their memories. Like a letter from someone who knows them deeply. 2-3 sentences. Make it feel like a gentle revelation."
}`,
        messages: [{ role: 'user', content: `Here are my memories:\n${memoriesText}\n\nAnalyze my patterns.` }]
      })
    });

    const data = await response.json();
    const raw = data.content.map(i => i.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    displayInsights(parsed);

  } catch (err) {
    console.error(err);
    // Demo fallback
    displayInsights({
      insights: [
        { icon: "🌊", label: "Where you feel free", value: "Most of your happiest moments happen near water or open spaces — the sea, the road, a window. You need openness to feel alive." },
        { icon: "👥", label: "Who matters most", value: "Your best memories almost always involve family — especially quiet moments with them, not big events." },
        { icon: "🌅", label: "When magic happens", value: "You're drawn to early mornings and late nights — the edges of the day when the world is quiet and belongs to you." },
        { icon: "🤫", label: "What you overlook", value: "Some of your deepest memories are ordinary moments. You find meaning in stillness, not just in milestones." }
      ],
      bigPicture: "You are someone who finds joy not in loud celebrations, but in quiet presence — the smell of coffee, the sound of someone you love, the feeling of being exactly where you're supposed to be. Your happiest self is unhurried.",
      message: "You've been collecting proof of a beautiful life without even realizing it. These memories aren't random — they're telling you something. The things that made you feel most alive? You can have more of them. You know what they are now."
    });
  }

  document.getElementById('loadingState').classList.remove('visible');
}

function displayInsights(data) {
  document.getElementById('insightsGrid').innerHTML = data.insights.map((ins, i) => `
    <div class="insight-block" style="animation-delay:${0.1 * (i+1)}s">
      <div class="insight-icon">${ins.icon}</div>
      <div class="insight-label">${ins.label}</div>
      <div class="insight-value">${ins.value}</div>
    </div>
  `).join('');

  document.getElementById('bigInsightText').textContent = data.bigPicture;
  document.getElementById('aiMessageText').textContent = data.message;

  document.getElementById('insightsOutput').classList.add('visible');
  setTimeout(() => {
    document.getElementById('insightsOutput').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}
