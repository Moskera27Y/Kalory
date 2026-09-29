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
    persist();
    res.json({ ok: true, token: sign(u.id), user: pub(u) });
  } catch (e) {
    res.status(401).json({ ok: false, error: 'google_invalido' });
  }
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
  persist();
  res.json({ ok: true });
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
