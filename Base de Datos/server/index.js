/**
 * Kalory API online — servidor central para todas las instalaciones.
 *
 * - Registro / login local (scrypt + JWT) y login con Google (verifica idToken).
 * - Perfil, diario (comidas/agua/ejercicio), logros y estadísticas por usuario.
 * - Panel admin en GET /admin (protegido con ADMIN_TOKEN).
 *
 * Variables de entorno (.env): PORT, JWT_SECRET, ADMIN_TOKEN,
 * GOOGLE_CLIENT_ID, DATA_FILE. Ver ../.env.example
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const initSqlJs = require('sql.js');

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'CAMBIA-ESTE-SECRETO-EN-PRODUCCION';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'kalory-admin-local';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '60146882018-1ad06p3sgqlo46ka8s2msm50r2m2durd.apps.googleusercontent.com';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'kalory-online.db');

let SQL = null;
let db = null;

async function ready() {
  if (db) return db;
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: (f) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f) });
  }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  let data = null;
  try { data = fs.readFileSync(DATA_FILE); } catch { data = null; }
  db = data ? new SQL.Database(data) : new SQL.Database();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pwd_hash TEXT,
      pwd_salt TEXT,
      google_sub TEXT UNIQUE,
      provider TEXT NOT NULL DEFAULT 'local',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_profile(
      user_id INTEGER PRIMARY KEY,
      profile_json TEXT NOT NULL,
      targets_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS food_log(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      kcal REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      meal TEXT NOT NULL DEFAULT 'extra',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS water_log(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      ml INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workout_log(
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      exercise TEXT NOT NULL,
      PRIMARY KEY(user_id, date, exercise)
    );
    CREATE TABLE IF NOT EXISTS achievement(
      user_id INTEGER NOT NULL,
      id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      PRIMARY KEY(user_id, id)
    );
    CREATE TABLE IF NOT EXISTS weight_log(
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      weight REAL NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY(user_id, date)
    );
    CREATE TABLE IF NOT EXISTS friendships(
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY(user_id, friend_id)
    );
    CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_log(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, date);
  `);
  return db;
}

function persist() {
  try { fs.writeFileSync(DATA_FILE, Buffer.from(db.export())); }
  catch (e) { console.error('[db] No se pudo guardar:', e.message); }
}

function rows(sql, params = []) {
  const st = db.prepare(sql);
  try {
    st.bind(params);
    const out = [];
    while (st.step()) out.push(st.getAsObject());
    return out;
  } finally { st.free(); }
}
function run(sql, params = []) {
  const st = db.prepare(sql);
  try { st.bind(params); st.step(); } finally { st.free(); }
}

const now = () => new Date().toISOString();
const pub = (r) => ({ id: r.id, name: r.name, email: r.email, provider: r.provider || 'local' });
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
const sign = (uid) => jwt.sign({ uid }, JWT_SECRET, { expiresIn: '30d' });
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'no_token' });
  try {
    req.uid = jwt.verify(token, JWT_SECRET).uid;
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'token_invalido' });
  }
}
function adminOnly(req, res, next) {
  if ((req.headers['x-admin-token'] || '') !== ADMIN_TOKEN) {
    return res.status(403).json({ ok: false, error: 'admin_denied' });
  }
  next();
}

async function verifyGoogleIdToken(idToken) {
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!r.ok) throw new Error('token_invalido');
  const info = await r.json();
  if (info.aud !== GOOGLE_CLIENT_ID) throw new Error('aud_invalido');
  if (!info.sub || !info.email) throw new Error('perfil_invalido');
  return { sub: info.sub, email: info.email, name: info.name || info.email };
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------- auth ----------
app.post('/api/auth/register', async (req, res) => {
  await ready();
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2) return res.status(400).json({ ok: false, error: 'nombre_corto' });
  if (!validEmail(email)) return res.status(400).json({ ok: false, error: 'email_invalido' });
  if (password.length < 6) return res.status(400).json({ ok: false, error: 'clave_corta' });
  if (rows('SELECT 1 AS ok FROM users WHERE email=?', [email]).length) {
    return res.status(409).json({ ok: false, error: 'email_en_uso' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  run('INSERT INTO users(name,email,pwd_hash,pwd_salt,provider,created_at) VALUES(?,?,?,?,?,?)',
    [name, email, hashPw(password, salt), salt, 'local', now()]);
  const u = rows('SELECT * FROM users WHERE email=?', [email])[0];
  persist();
  res.json({ ok: true, token: sign(u.id), user: pub(u) });
});

app.post('/api/auth/login', async (req, res) => {
  await ready();
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = rows('SELECT * FROM users WHERE email=?', [email])[0];
  if (!u || !u.pwd_hash || hashPw(req.body.password || '', u.pwd_salt) !== u.pwd_hash) {
    return res.status(401).json({ ok: false, error: 'credenciales' });
  }
  res.json({ ok: true, token: sign(u.id), user: pub(u) });
});

app.post('/api/auth/google', async (req, res) => {
  await ready();
  try {
    const g = await verifyGoogleIdToken(String(req.body.idToken || ''));
    const u = await findOrCreateGoogleUser(g);
    persist();
    res.json({ ok: true, token: sign(u.id), user: pub(u) });
  } catch (e) {
    res.status(401).json({ ok: false, error: 'google_invalido' });
  }
});

async function findOrCreateGoogleUser(g) {
  let u = rows('SELECT * FROM users WHERE google_sub=?', [g.sub])[0];
  if (!u) {
    const byEmail = rows('SELECT * FROM users WHERE email=?', [g.email.toLowerCase()])[0];
    if (byEmail) {
      run('UPDATE users SET google_sub=? WHERE id=?', [g.sub, byEmail.id]);
      u = rows('SELECT * FROM users WHERE id=?', [byEmail.id])[0];
    } else {
      run('INSERT INTO users(name,email,google_sub,provider,created_at) VALUES(?,?,?,?,?)',
        [g.name, g.email.toLowerCase(), g.sub, 'google', now()]);
      u = rows('SELECT * FROM users WHERE google_sub=?', [g.sub])[0];
    }
  }
  return u;
}

// ---------- Google en móvil: navegador del sistema + sondeo ----------
// El WebView no puede abrir Google (403 disallowed_useragent): se usa el
// navegador del sistema y la app sondea hasta completar el acceso.
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
function publicBase() {
  if (process.env.PUBLIC_URL) return String(process.env.PUBLIC_URL).replace(/\/+$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return '';
}
const pendingGoogle = new Map(); // state -> { createdAt, token?, user? }
setInterval(() => {
  const nowMs = Date.now();
  for (const [k, v] of pendingGoogle) {
    if (nowMs - v.createdAt > 6 * 60 * 1000) pendingGoogle.delete(k);
  }
}, 60 * 1000).unref?.();

app.post('/api/auth/google/start', async (req, res) => {
  await ready();
  const base = publicBase();
  if (!base) return res.status(500).json({ ok: false, error: 'sin_public_url' });
  const state = crypto.randomBytes(16).toString('hex');
  pendingGoogle.set(state, { createdAt: Date.now() });
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${base}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();
  res.json({ ok: true, url, state });
});

app.get('/api/auth/google/callback', async (req, res) => {
  await ready();
  const page = (title, msg) => res.send(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
    `<body style="font-family:sans-serif;background:#0A0F1E;color:#F3F4F6;text-align:center;padding:15vh 20px;margin:0">` +
    `<h2>${title}</h2><p style="color:#9CA3AF">${msg}</p></body></html>`,
  );
  const { code, state } = req.query;
  const pend = pendingGoogle.get(String(state || ''));
  if (!pend) return page('Enlace expirado', 'Vuelve a Kalory y pulsa de nuevo “Continuar con Google”.');
  if (!code) {
    pendingGoogle.delete(String(state));
    return page('Acceso cancelado', 'Vuelve a Kalory e inténtalo de nuevo.');
  }
  try {
    if (!GOOGLE_CLIENT_SECRET) throw new Error('sin_secreto');
    const base = publicBase();
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${base}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) throw new Error('canje_fallido');
    const tok = await tokenRes.json();
    if (!tok.id_token) throw new Error('canje_fallido');
    const payload = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64').toString('utf8'));
    if (!payload.sub || !payload.email || payload.aud !== GOOGLE_CLIENT_ID) throw new Error('perfil_invalido');
    const u = await findOrCreateGoogleUser({ sub: payload.sub, email: payload.email, name: payload.name || payload.email });
    pend.token = sign(u.id);
    pend.user = pub(u);
    persist();
    return page('¡Listo! 🎉', 'Ya puedes volver a Kalory: tu sesión está iniciada.');
  } catch (e) {
    pendingGoogle.delete(String(state));
    return page('No se pudo completar', 'Vuelve a Kalory e inténtalo de nuevo. (' + (e.message || 'error') + ')');
  }
});

app.get('/api/auth/google/poll', async (req, res) => {
  const key = String(req.query.state || '');
  const pend = pendingGoogle.get(key);
  if (!pend) return res.status(404).json({ ok: false, error: 'expirado' });
  if (Date.now() - pend.createdAt > 5 * 60 * 1000) {
    pendingGoogle.delete(key);
    return res.status(404).json({ ok: false, error: 'expirado' });
  }
  if (pend.token) {
    pendingGoogle.delete(key);
    return res.json({ ok: true, token: pend.token, user: pend.user });
  }
  return res.json({ ok: true, pending: true });
});

// ---------- datos del usuario ----------
app.get('/api/bootstrap', auth, async (req, res) => {
  await ready();
  const date = String(req.query.date || now().slice(0, 10));
  const u = rows('SELECT * FROM users WHERE id=?', [req.uid])[0];
  if (!u) return res.status(401).json({ ok: false, error: 'no_user' });
  const p = rows('SELECT profile_json, targets_json FROM user_profile WHERE user_id=?', [req.uid])[0];
  const foods = rows('SELECT * FROM food_log WHERE user_id=? AND date=? ORDER BY id', [req.uid, date]);
  const w = rows('SELECT COALESCE(SUM(ml),0) AS total FROM water_log WHERE user_id=? AND date=?', [req.uid, date])[0];
  const done = rows('SELECT exercise FROM workout_log WHERE user_id=? AND date=?', [req.uid, date]).map((r) => r.exercise);
  const totalFoods = rows('SELECT COUNT(*) AS n FROM food_log WHERE user_id=?', [req.uid])[0].n;
  const days = rows(`SELECT COUNT(*) AS n FROM (
    SELECT date FROM food_log WHERE user_id=?
    UNION SELECT date FROM water_log WHERE user_id=? AND ml > 0
    UNION SELECT date FROM workout_log WHERE user_id=?)`, [req.uid, req.uid, req.uid])[0].n;
  res.json({
    ok: true,
    user: pub(u),
    profile: p ? JSON.parse(p.profile_json) : null,
    targets: p ? JSON.parse(p.targets_json) : null,
    achievements: rows('SELECT id, unlocked_at FROM achievement WHERE user_id=? ORDER BY unlocked_at', [req.uid]),
    day: { date, foods, waterMl: Math.max(0, w.total), done },
    stats: { totalFoods, activeDays: days },
  });
});

app.put('/api/profile', auth, async (req, res) => {
  await ready();
  run(`INSERT INTO user_profile(user_id, profile_json, targets_json) VALUES(?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json, targets_json=excluded.targets_json`,
    [req.uid, JSON.stringify(req.body.profile), JSON.stringify(req.body.targets)]);
  persist();
  res.json({ ok: true });
});

app.post('/api/foods', auth, async (req, res) => {
  await ready();
  const b = req.body;
  run('INSERT INTO food_log(user_id,date,name,kcal,protein,carbs,fat,meal,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
    [req.uid, b.date, b.name, b.kcal, b.protein || 0, b.carbs || 0, b.fat || 0, b.meal || 'extra', now()]);
  persist();
  res.json({ ok: true, id: rows('SELECT last_insert_rowid() AS id')[0].id });
});

app.delete('/api/foods/:id', auth, async (req, res) => {
  await ready();
  run('DELETE FROM food_log WHERE id=? AND user_id=?', [req.params.id, req.uid]);
  persist();
  res.json({ ok: true });
});

app.post('/api/water', auth, async (req, res) => {
  await ready();
  run('INSERT INTO water_log(user_id,date,ml,created_at) VALUES(?,?,?,?)', [req.uid, req.body.date, req.body.ml, now()]);
  persist();
  const w = rows('SELECT COALESCE(SUM(ml),0) AS total FROM water_log WHERE user_id=? AND date=?', [req.uid, req.body.date])[0];
  res.json({ ok: true, total: Math.max(0, w.total) });
});

app.post('/api/exercises/toggle', auth, async (req, res) => {
  await ready();
  const { date, exercise } = req.body;
  const ex = rows('SELECT 1 AS ok FROM workout_log WHERE user_id=? AND date=? AND exercise=?', [req.uid, date, exercise]).length > 0;
  if (ex) run('DELETE FROM workout_log WHERE user_id=? AND date=? AND exercise=?', [req.uid, date, exercise]);
  else run('INSERT INTO workout_log(user_id,date,exercise) VALUES(?,?,?)', [req.uid, date, exercise]);
  persist();
  res.json({ ok: true, done: !ex });
});

app.post('/api/achievements/unlock', auth, async (req, res) => {
  await ready();
  const at = now();
  run('INSERT INTO achievement(user_id,id,unlocked_at) VALUES(?,?,?) ON CONFLICT(user_id,id) DO NOTHING', [req.uid, req.body.id, at]);
  persist();
  res.json({ ok: true, at });
});

app.delete('/api/account/data', auth, async (req, res) => {
  await ready();
  run('DELETE FROM user_profile WHERE user_id=?', [req.uid]);
  run('DELETE FROM food_log WHERE user_id=?', [req.uid]);
  run('DELETE FROM water_log WHERE user_id=?', [req.uid]);
  run('DELETE FROM workout_log WHERE user_id=?', [req.uid]);
  run('DELETE FROM achievement WHERE user_id=?', [req.uid]);
  run('DELETE FROM weight_log WHERE user_id=?', [req.uid]);
  persist();
  res.json({ ok: true });
});

// ---------- peso ----------
app.post('/api/weight', auth, async (req, res) => {
  await ready();
  run(`INSERT INTO weight_log(user_id,date,weight,created_at) VALUES(?,?,?,?)
       ON CONFLICT(user_id,date) DO UPDATE SET weight=excluded.weight, created_at=excluded.created_at`,
    [req.uid, req.body.date, req.body.weight, now()]);
  persist();
  res.json({ ok: true });
});

app.get('/api/weights', auth, async (req, res) => {
  await ready();
  const { from = '2000-01-01', to = '2999-12-31' } = req.query;
  res.json({ ok: true, weights: rows('SELECT date, weight FROM weight_log WHERE user_id=? AND date>=? AND date<=? ORDER BY date', [req.uid, from, to]) });
});

// ---------- historial agregado por día ----------
app.get('/api/history', auth, async (req, res) => {
  await ready();
  const { from = '2000-01-01', to = '2999-12-31' } = req.query;
  const days = new Map();
  const get = (d) => {
    if (!days.has(d)) days.set(d, { date: d, kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0, exercises: 0, weight: null });
    return days.get(d);
  };
  for (const f of rows('SELECT date, kcal, protein, carbs, fat FROM food_log WHERE user_id=? AND date>=? AND date<=?', [req.uid, from, to])) {
    const d = get(f.date);
    d.kcal += f.kcal; d.protein += f.protein; d.carbs += f.carbs; d.fat += f.fat;
  }
  for (const w of rows('SELECT date, SUM(ml) AS ml FROM water_log WHERE user_id=? AND date>=? AND date<=? GROUP BY date', [req.uid, from, to])) {
    get(w.date).waterMl = Math.max(0, w.ml);
  }
  for (const x of rows('SELECT date, COUNT(*) AS n FROM workout_log WHERE user_id=? AND date>=? AND date<=? GROUP BY date', [req.uid, from, to])) {
    get(x.date).exercises = x.n;
  }
  for (const p of rows('SELECT date, weight FROM weight_log WHERE user_id=? AND date>=? AND date<=?', [req.uid, from, to])) {
    get(p.date).weight = p.weight;
  }
  // Rellena días vacíos del rango para gráficas continuas
  const out = [];
  for (let d = String(from); d <= String(to); d = nextDay(d)) out.push(days.get(d) || { date: d, kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0, exercises: 0, weight: null });
  res.json({ ok: true, days: out });
});

function nextDay(s) {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------- exportar todo (backup JSON) ----------
app.get('/api/export', auth, async (req, res) => {
  await ready();
  const u = rows('SELECT * FROM users WHERE id=?', [req.uid])[0];
  const p = rows('SELECT profile_json, targets_json FROM user_profile WHERE user_id=?', [req.uid])[0];
  res.json({
    ok: true,
    backup: {
      type: 'kalory-backup', version: 1, exported_at: now(),
      user: pub(u),
      profile: p ? JSON.parse(p.profile_json) : null,
      targets: p ? JSON.parse(p.targets_json) : null,
      foods: rows('SELECT date,name,kcal,protein,carbs,fat,meal,created_at FROM food_log WHERE user_id=? ORDER BY id', [req.uid]),
      waters: rows('SELECT date,ml,created_at FROM water_log WHERE user_id=? ORDER BY id', [req.uid]),
      workouts: rows('SELECT date,exercise FROM workout_log WHERE user_id=?', [req.uid]),
      achievements: rows('SELECT id,unlocked_at FROM achievement WHERE user_id=? ORDER BY unlocked_at', [req.uid]),
      weights: rows('SELECT date,weight FROM weight_log WHERE user_id=? ORDER BY date', [req.uid]),
    },
  });
});

// ---------- versión (aviso de actualización en la app) ----------
const APP_VERSION = '1.6.0';
app.get('/api/version', (req, res) => {
  res.json({
    ok: true,
    version: APP_VERSION,
    url: 'https://github.com/Moskera27Y/Kalory/releases',
    notes: 'Descarga la última versión desde la página de releases.',
  });
});

// ---------- comunidad: amigos y ranking semanal ----------
function inviteCode(uid) {
  return 'KAL-' + Number(uid).toString(36).toUpperCase().padStart(6, '0');
}
function uidFromCode(code) {
  const m = /^KAL-([0-9A-Z]{1,6})$/i.exec(String(code || '').trim());
  if (!m) return null;
  const id = parseInt(m[1], 36);
  return Number.isFinite(id) && id > 0 ? id : null;
}
function weekStart() {
  const n = new Date();
  const dow = (n.getDay() + 6) % 7;
  n.setDate(n.getDate() - dow);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
function weekScore(uid) {
  const ws = weekStart();
  const days = rows(`SELECT COUNT(*) AS n FROM (
    SELECT date FROM food_log WHERE user_id=? AND date>=?
    UNION SELECT date FROM water_log WHERE user_id=? AND date>=? AND ml > 0
    UNION SELECT date FROM workout_log WHERE user_id=? AND date>=?)`, [uid, ws, uid, ws, uid, ws])[0].n;
  const works = rows('SELECT COUNT(*) AS n FROM workout_log WHERE user_id=? AND date>=?', [uid, ws])[0].n;
  const medals = rows('SELECT COUNT(*) AS n FROM achievement WHERE user_id=?', [uid])[0].n;
  return { days, works, medals, score: days * 10 + works * 5 + medals * 2 };
}

app.get('/api/social/code', auth, async (req, res) => {
  await ready();
  res.json({ ok: true, code: inviteCode(req.uid) });
});

app.post('/api/social/add', auth, async (req, res) => {
  await ready();
  const fid = uidFromCode(req.body.code);
  if (!fid) return res.status(400).json({ ok: false, error: 'codigo_invalido' });
  if (fid === req.uid) return res.status(400).json({ ok: false, error: 'eres_tu' });
  const exists = rows('SELECT * FROM users WHERE id=?', [fid])[0];
  if (!exists) return res.status(404).json({ ok: false, error: 'no_existe' });
  run('INSERT INTO friendships(user_id,friend_id,created_at) VALUES(?,?,?) ON CONFLICT(user_id,friend_id) DO NOTHING', [req.uid, fid, now()]);
  run('INSERT INTO friendships(user_id,friend_id,created_at) VALUES(?,?,?) ON CONFLICT(user_id,friend_id) DO NOTHING', [fid, req.uid, now()]);
  persist();
  res.json({ ok: true, friend: pub(exists) });
});

app.get('/api/social/friends', auth, async (req, res) => {
  await ready();
  const ids = rows('SELECT friend_id FROM friendships WHERE user_id=?', [req.uid]).map((r) => r.friend_id);
  res.json({
    ok: true,
    friends: ids.map((id) => {
      const u = rows('SELECT * FROM users WHERE id=?', [id])[0];
      return u ? { ...pub(u), week: weekScore(id) } : null;
    }).filter(Boolean),
  });
});

app.get('/api/social/leaderboard', auth, async (req, res) => {
  await ready();
  const ids = rows('SELECT friend_id FROM friendships WHERE user_id=?', [req.uid]).map((r) => r.friend_id);
  const all = [req.uid, ...ids];
  const rows_ = all.map((id) => {
    const u = rows('SELECT * FROM users WHERE id=?', [id])[0];
    return u ? { ...pub(u), me: id === req.uid, week: weekScore(id) } : null;
  }).filter(Boolean);
  rows_.sort((a, b) => b.week.score - a.week.score);
  res.json({ ok: true, board: rows_ });
});

// ---------- admin ----------
app.get('/api/admin/users', adminOnly, async (req, res) => {
  await ready();
  const users = rows(`
    SELECT u.id, u.name, u.email, u.provider, u.created_at,
      (SELECT COUNT(*) FROM food_log f WHERE f.user_id=u.id) AS foods,
      (SELECT COUNT(*) FROM water_log w WHERE w.user_id=u.id) AS waters,
      (SELECT COUNT(*) FROM workout_log x WHERE x.user_id=u.id) AS exercises,
      (SELECT COUNT(*) FROM achievement a WHERE a.user_id=u.id) AS medals,
      (SELECT p.profile_json IS NOT NULL FROM user_profile p WHERE p.user_id=u.id) AS has_profile,
      (SELECT MAX(d) FROM (
        SELECT MAX(created_at) AS d FROM food_log WHERE user_id=u.id
        UNION ALL SELECT MAX(created_at) FROM water_log WHERE user_id=u.id
        UNION ALL SELECT u.created_at) ) AS last_activity
    FROM users u ORDER BY u.id`);
  const totals = {
    users: users.length,
    foods: rows('SELECT COUNT(*) AS n FROM food_log')[0].n,
    medals: rows('SELECT COUNT(*) AS n FROM achievement')[0].n,
  };
  res.json({ ok: true, totals, users });
});

app.get('/api/admin/users/:id', adminOnly, async (req, res) => {
  await ready();
  const u = rows('SELECT * FROM users WHERE id=?', [req.params.id])[0];
  if (!u) return res.status(404).json({ ok: false, error: 'no_user' });
  const p = rows('SELECT profile_json, targets_json FROM user_profile WHERE user_id=?', [u.id])[0];
  res.json({
    ok: true,
    user: pub(u),
    created_at: u.created_at,
    profile: p ? JSON.parse(p.profile_json) : null,
    targets: p ? JSON.parse(p.targets_json) : null,
    recentFoods: rows('SELECT date,name,kcal,meal,created_at FROM food_log WHERE user_id=? ORDER BY id DESC LIMIT 20', [u.id]),
    achievements: rows('SELECT id, unlocked_at FROM achievement WHERE user_id=? ORDER BY unlocked_at', [u.id]),
  });
});

// ---------- panel + salud ----------
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'kalory-server', time: now() }));

ready().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Kalory Server en http://0.0.0.0:${PORT} — panel: /admin`));
});
