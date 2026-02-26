const API_BASE = ''; // same origin when served by Flask

let memories = [];
let selectedMood = '';
let currentPhoto = null;

// Toast (replaces alert)
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  el.textContent = message;
  container.appendChild(el);
  const remove = () => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 320);
  };
  setTimeout(remove, 4000);
}

// Stars background
const canvas = document.getElementById('stars-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let stars = [];

function initStars() {
  if (!canvas || !ctx) return;
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
  if (!ctx) return;
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
if (canvas) {
  initStars();
  drawStars();
}

// Constellation animation
function animateConstellation() {
  const c = document.getElementById('constellation');
  if (!c) return;
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

const constellationEl = document.getElementById('constellation');
if (constellationEl) {
  animateConstellation();
  setInterval(animateConstellation, 5000);
}

// Mood selector
const moodSelector = document.getElementById('moodSelector');
if (moodSelector) {
  moodSelector.addEventListener('click', e => {
    if (e.target.classList.contains('mood-btn')) {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      selectedMood = e.target.dataset.mood;
    }
  });
}

// Photo upload
const photoIn = document.getElementById('photoIn');
if (photoIn) {
  photoIn.addEventListener('change', function(e) {
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
}

function addMemory() {
  const title = document.getElementById('memTitle').value.trim();
  const desc = document.getElementById('memDesc').value.trim();
  const date = document.getElementById('memDate').value.trim();
  const place = document.getElementById('memPlace').value.trim();

  if (!title && !desc) { toast('Add a title or description ✦'); return; }

  fetch(`${API_BASE}/memories/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title || 'Untitled memory',
      desc,
      date: date || '',
      place: place || '',
      mood: selectedMood || 'Nostalgic',
      image: currentPhoto || null
    })
  })
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .then(() => {
      document.getElementById('memTitle').value = '';
      document.getElementById('memDesc').value = '';
      document.getElementById('memDate').value = '';
      document.getElementById('memPlace').value = '';
      document.getElementById('photoPreview').src = '';
      document.getElementById('photoUpload').classList.remove('has-photo');
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      selectedMood = '';
      currentPhoto = null;
      loadMemories();
    })
    .catch(() => toast('Failed to save memory ✦', 'error'));
}

function deleteMemory(id) {
  fetch(`${API_BASE}/memories/${id}`, { method: 'DELETE' })
    .then(r => r.ok ? loadMemories() : Promise.reject())
    .catch(() => toast('Failed to delete ✦', 'error'));
}

function loadMemories() {
  const loadingEl = document.getElementById('app-loading');
  const COLD_START_TIMEOUT = 25000; // 25s for Render cold start

  const hideLoading = () => {
    if (loadingEl) loadingEl.classList.add('hidden');
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    hideLoading();
    memories = [];
    renderGrid();
    if (loadingEl) toast('Server may be waking up (free tier). Refresh in a moment if the page is empty.');
  }, COLD_START_TIMEOUT);

  fetch(`${API_BASE}/memories/all`, { signal: controller.signal })
    .then(r => r.json())
    .then(data => { clearTimeout(timeoutId); memories = data; renderGrid(); hideLoading(); })
    .catch(() => { clearTimeout(timeoutId); memories = []; renderGrid(); hideLoading(); });
}

function renderGrid() {
  const grid = document.getElementById('memoriesGrid');
  document.getElementById('memCount').textContent = memories.length;

  if (!memories.length) {
    grid.innerHTML = '<div class="empty-grid">No memories yet — add your first one above</div>';
    return;
  }

  grid.innerHTML = memories.map(m => `
    <div class="mem-card" id="card-${m.id}" onclick="openMemory(${m.id})" style="cursor:pointer;">
      <button class="mem-delete" onclick="event.stopPropagation(); deleteMemory(${m.id});">✕</button>
      ${m.image
        ? `<img class="mem-photo" src="${m.image.startsWith('data:') ? m.image : (API_BASE || '') + m.image}" alt="">`
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

// Demo data — add via API
function loadDemoData() {
  const demo = [
    { title: "Sunrise at the sea", desc: "Woke up before anyone else and watched the sun rise over the water. Dad was there, quiet, just us two.", date: "Summer 2018", place: "Latakia coast", mood: "Peaceful", image: null },
    { title: "Graduation day", desc: "Everyone was proud. Mom was crying. I remember the feeling of finally being done.", date: "June 2022", place: "University, Nablus", mood: "Joyful", image: null },
    { title: "Road trip through the north", desc: "Just friends, an old car, no plan. We got lost three times and laughed the entire way.", date: "Spring 2021", place: "Northern roads", mood: "Adventurous", image: null },
    { title: "Ramadan nights with family", desc: "After iftar, everyone gathered. My grandmother told old stories. The whole house smelled like coffee.", date: "Ramadan 2019", place: "Grandma's house", mood: "Loving", image: null },
    { title: "First time I built something real", desc: "Stayed up until 4am finishing a project. When it finally worked, I sat alone in the dark and smiled.", date: "Late 2023", place: "Home", mood: "Joyful", image: null },
    { title: "A quiet afternoon that mattered", desc: "Nothing happened. I was reading by the window. But I remember feeling completely at peace.", date: "Winter 2020", place: "My room", mood: "Nostalgic", image: null },
  ];
  let done = 0;
  demo.forEach(m => {
    fetch(`${API_BASE}/memories/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m)
    }).then(r => { if (r.ok) { done++; if (done === demo.length) { loadMemories(); document.querySelector('.demo-btn').textContent = '✓ Demo memories loaded'; } } });
  });
}

async function discoverPattern() {
  if (memories.length < 2) {
    toast('Add at least 2 memories first ✦');
    return;
  }

  document.getElementById('loadingState').classList.add('visible');
  document.getElementById('insightsOutput').classList.remove('visible');

  try {
    const response = await fetch(`${API_BASE}/analyze`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      toast(data.error || 'Analysis failed ✦', 'error');
      return;
    }
    displayInsights(data);
  } catch (err) {
    console.error(err);
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

// ── Memory detail overlay ─────────────────────────────────────────
function openMemory(id) {
  const m = memories.find(x => x.id === id);
  if (!m) return;

  const photoWrap = document.getElementById('overlayPhotoWrap');
  if (m.image) {
    const src = m.image.startsWith('data:') ? m.image : (API_BASE || '') + m.image;
    photoWrap.innerHTML = `<img class="overlay-photo" src="${src}" alt="">`;
  } else {
    photoWrap.innerHTML = `<div class="overlay-photo-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
  }

  document.getElementById('overlayMeta').textContent = [m.date, m.place].filter(Boolean).join(' · ') || 'A moment in time';
  document.getElementById('overlayTitle').textContent = m.title;
  document.getElementById('overlayDesc').textContent = m.desc || 'No description added.';
  document.getElementById('overlayMood').textContent = m.mood;

  document.getElementById('overlayDeleteBtn').onclick = () => {
    deleteMemory(id);
    closeOverlay();
  };

  document.getElementById('overlayAiBox').innerHTML = `
    <div class="overlay-ai-loading">
      <div class="orb" style="animation-delay:0s"></div>
      <div class="orb" style="animation-delay:0.25s"></div>
      <div class="orb" style="animation-delay:0.5s"></div>
      <span>Reading your memory…</span>
    </div>`;

  document.getElementById('memOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  analyzeOneMemory(m);
}

function closeOverlay() {
  document.getElementById('memOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });

async function analyzeOneMemory(m) {
  try {
    const response = await fetch(`${API_BASE}/analyze/one`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory: m })
    });
    const data = await response.json();
    if (data.insight) {
      showAiInsight(data.insight);
    } else {
      showAiInsightFallback(m.mood);
    }
  } catch (err) {
    showAiInsightFallback(m.mood);
  }
}

function showAiInsight(text) {
  document.getElementById('overlayAiBox').innerHTML = `<div class="overlay-ai-text">${escapeHtml(text)}</div>`;
}

function showAiInsightFallback(mood) {
  const fallbacks = {
    Peaceful: "There's something about stillness that you seek — and this memory is proof you know how to find it. You didn't need anything extraordinary. Just the right moment, and you were completely present.",
    Joyful: "Joy like this doesn't happen by accident. You were exactly where you needed to be, with exactly the right people. This memory is a map back to your happiest self.",
    Nostalgic: "This memory lives in you because part of you knows that moment was rare. You felt it even then — that quiet awareness that something beautiful was happening.",
    Bittersweet: "The most meaningful memories often carry both joy and ache. This one stayed with you because it mattered — deeply, truly, in a way that changed something in you.",
    Adventurous: "You were fully alive in this memory. No hesitation, no plan — just you and the moment. This is the version of yourself you return to when you need courage.",
    Loving: "Love like this is the kind that leaves a mark. This memory isn't just about the people in it — it's about who you become when you're surrounded by them."
  };
  showAiInsight(fallbacks[mood] || fallbacks.Nostalgic);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Share links — use current origin so it works locally and on any deploy
const SHARE_URL = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://memory-capsule-rkgi.onrender.com/';
const SHARE_TEXT = 'Memory Capsule — Find your pattern. Save memories, let AI show you what truly makes you happy.';

function setupShareLinks() {
  document.getElementById('shareTwitter').href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`;
  document.getElementById('shareFacebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`;
  document.getElementById('shareLinkedIn').href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;
  document.getElementById('shareWhatsApp').href = `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + ' ' + SHARE_URL)}`;
  document.getElementById('shareCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(SHARE_URL).then(() => toast('Link copied ✦')).catch(() => toast('Could not copy ✦', 'error'));
  });
}
setupShareLinks();

loadMemories();

// If loading overlay is still visible after 60s (e.g. server never responded), hide it
setTimeout(() => {
  const el = document.getElementById('app-loading');
  if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
}, 60000);
