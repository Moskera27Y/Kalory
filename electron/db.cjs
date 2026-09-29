/**
 * Kalory DB — SQLite local (sql.js) persistido en `<userData>/kalory.db`.
 * - Sin servidor ni puertos fijos: archivo local, funciona offline.
 * - Cuentas locales (email + contraseña con scrypt) e inicio con Google
 *   (OAuth PKCE con callback loopback en puerto efímero, ver google.cjs).
 * - Cada usuario tiene su perfil, registros y medallas separados.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app } = require('electron');
const { signInWithGoogle } = require('./google.cjs');

let SQL = null;
let db = null;
let dbFile = '';
let currentUserId = null;

/** Client ID de Google preconfigurado (es público por diseño, va en la URL de login). */
const DEFAULT_GOOGLE_CLIENT_ID = '60146882018-1ad06p3sgqlo46ka8s2msm50r2m2durd.apps.googleusercontent.com';
/** Secreto de Google (solo si el cliente es tipo "Web"; los de "Escritorio" no lo usan).
 *  Se graba aquí al compilar; NUNCA se muestra en la interfaz ni viaja al renderer. */
const DEFAULT_GOOGLE_CLIENT_SECRET = '';

function getGoogleClientId() {
  const row = rows("SELECT value FROM kv WHERE key='google_client_id'")[0];
  const v = row ? String(row.value || '').trim() : '';
  return v || DEFAULT_GOOGLE_CLIENT_ID;
}

function getGoogleClientSecret() {
  const row = rows("SELECT value FROM kv WHERE key='google_client_secret'")[0];
  const v = row ? String(row.value || '').trim() : '';
  return v || DEFAULT_GOOGLE_CLIENT_SECRET;
}

function resolveDbFile() {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'kalory.db');
}

async function ready() {
  if (db) return db;
  if (!SQL) {
    const initSqlJs = require('sql.js');
    SQL = await initSqlJs({
      locateFile: (f) => {
        const cands = [
          path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', f),
          path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f),
        ];
        return cands.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || cands[1];
      },
    });
  }
  dbFile = resolveDbFile();
  let data = null;
  try {
    data = fs.readFileSync(dbFile);
  } catch {
    data = null;
  }
  db = data ? new SQL.Database(data) : new SQL.Database();
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY, value TEXT);
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
      user_id INTEGER NOT NULL DEFAULT 0,
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
      user_id INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      ml INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workout_log(
      user_id INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      exercise TEXT NOT NULL,
      PRIMARY KEY(user_id, date, exercise)
    );
    CREATE TABLE IF NOT EXISTS achievement(
      user_id INTEGER NOT NULL DEFAULT 0,
      id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      PRIMARY KEY(user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_log(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, date);
  `);
  // Migración: tablas creadas antes del soporte multiusuario
  for (const t of ['food_log', 'water_log', 'workout_log', 'achievement']) {
    const cols = rows(`PRAGMA table_info(${t})`).map((c) => c.name);
    if (!cols.includes('user_id')) {
      db.exec(`ALTER TABLE ${t} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0`);
    }
  }
  // Columna google_sub en instalaciones previas
  if (!rows('PRAGMA table_info(users)').map((c) => c.name).includes('google_sub')) {
    db.exec('ALTER TABLE users ADD COLUMN google_sub TEXT UNIQUE');
  }
  const sess = rows("SELECT value FROM kv WHERE key='current_user_id'");
  if (sess.length && sess[0].value) currentUserId = Number(sess[0].value);
  return db;
}

function persist() {
  if (!db || !dbFile) return;
  try {
    fs.writeFileSync(dbFile, Buffer.from(db.export()));
  } catch (e) {
    console.error('[kalory-db] No se pudo guardar:', e.message);
  }
}

function rows(sql, params = []) {
  const st = db.prepare(sql);
  try {
    st.bind(params);
    const out = [];
    while (st.step()) out.push(st.getAsObject());
    return out;
  } finally {
    st.free();
  }
}

function run(sql, params = []) {
  const st = db.prepare(sql);
  try {
    st.bind(params);
    st.step();
  } finally {
    st.free();
  }
}

const now = () => new Date().toISOString();
const publicUser = (r) => ({ id: r.id, name: r.name, email: r.email, provider: r.provider || 'local' });

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function setSession(uid) {
  currentUserId = uid;
  if (uid == null) run("DELETE FROM kv WHERE key='current_user_id'");
  else run("INSERT INTO kv(key, value) VALUES('current_user_id', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [String(uid)]);
  persist();
}

function requireUid() {
  if (currentUserId == null) {
    const e = new Error('no_session');
    e.code = 'no_session';
    throw e;
  }
  return currentUserId;
}

/** Adopta el perfil antiguo (v1, sin usuario) a la primera cuenta que entre. */
function adoptLegacy(uid) {
  const kv = Object.fromEntries(rows('SELECT key, value FROM kv').map((r) => [r.key, r.value]));
  const has = rows('SELECT 1 AS ok FROM user_profile WHERE user_id=?', [uid]).length > 0;
  if (!has && kv.profile && kv.targets) {
    run('INSERT INTO user_profile(user_id, profile_json, targets_json) VALUES(?,?,?)', [uid, kv.profile, kv.targets]);
    run("DELETE FROM kv WHERE key IN ('profile','targets')");
    persist();
  }
}

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

const handlers = {
  // ---------- sesión ----------
  'kalory:get-state': async () => {
    await ready();
    if (currentUserId == null) return { user: null, profile: null, targets: null, achievements: [] };
    const u = rows('SELECT * FROM users WHERE id=?', [currentUserId])[0];
    if (!u) { setSession(null); return { user: null, profile: null, targets: null, achievements: [] }; }
    adoptLegacy(u.id);
    const p = rows('SELECT profile_json, targets_json FROM user_profile WHERE user_id=?', [u.id])[0];
    return {
      user: publicUser(u),
      profile: p ? JSON.parse(p.profile_json) : null,
      targets: p ? JSON.parse(p.targets_json) : null,
      achievements: rows('SELECT id, unlocked_at FROM achievement WHERE user_id=? ORDER BY unlocked_at', [u.id]),
    };
  },

  'auth:register': async ({ name, email, password }) => {
    await ready();
    name = String(name || '').trim();
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (name.length < 2) return { ok: false, error: 'nombre_corto' };
    if (!validEmail(email)) return { ok: false, error: 'email_invalido' };
    if (password.length < 6) return { ok: false, error: 'clave_corta' };
    if (rows('SELECT 1 AS ok FROM users WHERE email=?', [email]).length > 0) return { ok: false, error: 'email_en_uso' };
    const salt = crypto.randomBytes(16).toString('hex');
    run('INSERT INTO users(name, email, pwd_hash, pwd_salt, provider, created_at) VALUES(?,?,?,?,?,?)',
      [name, email, hashPassword(password, salt), salt, 'local', now()]);
    const u = rows('SELECT * FROM users WHERE email=?', [email])[0];
    setSession(u.id);
    adoptLegacy(u.id);
    return { ok: true, user: publicUser(u) };
  },

  'auth:login': async ({ email, password }) => {
    await ready();
    email = String(email || '').trim().toLowerCase();
    const u = rows('SELECT * FROM users WHERE email=?', [email])[0];
    if (!u || !u.pwd_hash) return { ok: false, error: 'credenciales' };
    if (hashPassword(String(password || ''), u.pwd_salt) !== u.pwd_hash) return { ok: false, error: 'credenciales' };
    setSession(u.id);
    adoptLegacy(u.id);
    return { ok: true, user: publicUser(u) };
  },

  'auth:google': async () => {
    await ready();
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    let g;
    try {
      g = await signInWithGoogle(clientId, clientSecret);
    } catch (e) {
      return { ok: false, error: e && e.code ? e.code : 'google_error', detail: (e && e.detail) || undefined };
    }
    let u = rows('SELECT * FROM users WHERE google_sub=?', [g.sub])[0];
    if (!u) {
      const byEmail = rows('SELECT * FROM users WHERE email=?', [g.email.toLowerCase()])[0];
      if (byEmail) {
        run('UPDATE users SET google_sub=?, provider=? WHERE id=?', [g.sub, byEmail.provider === 'local' ? 'local+google' : byEmail.provider, byEmail.id]);
        u = rows('SELECT * FROM users WHERE id=?', [byEmail.id])[0];
      } else {
        run('INSERT INTO users(name, email, google_sub, provider, created_at) VALUES(?,?,?,?,?)',
          [g.name, g.email.toLowerCase(), g.sub, 'google', now()]);
        u = rows('SELECT * FROM users WHERE google_sub=?', [g.sub])[0];
      }
    }
    setSession(u.id);
    adoptLegacy(u.id);
    return { ok: true, user: publicUser(u) };
  },

  'auth:logout': async () => {
    await ready();
    setSession(null);
    return true;
  },

  /** Devuelve solo el idToken de Google (para el modo online: lo verifica el servidor). */
  'auth:google-token': async () => {
    await ready();
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    try {
      const g = await signInWithGoogle(clientId, clientSecret);
      return { ok: true, idToken: g.idToken };
    } catch (e) {
      return { ok: false, error: e && e.code ? e.code : 'google_error', detail: (e && e.detail) || undefined };
    }
  },

  'auth:get-google-client-id': async () => {
    await ready();
    return getGoogleClientId();
  },

  'auth:set-google-client-id': async ({ clientId }) => {
    await ready();
    const v = String(clientId || '').trim();
    run("INSERT INTO kv(key, value) VALUES('google_client_id', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [v]);
    persist();
    return true;
  },

  // ---------- datos del usuario activo ----------
  'kalory:save-profile': async ({ profile, targets }) => {
    await ready();
    const uid = requireUid();
    run('INSERT INTO user_profile(user_id, profile_json, targets_json) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json, targets_json=excluded.targets_json',
      [uid, JSON.stringify(profile), JSON.stringify(targets)]);
    persist();
    return true;
  },

  'kalory:log-food': async ({ date, name, kcal, protein = 0, carbs = 0, fat = 0, meal = 'extra' }) => {
    await ready();
    const uid = requireUid();
    run('INSERT INTO food_log(user_id, date, name, kcal, protein, carbs, fat, meal, created_at) VALUES(?,?,?,?,?,?,?,?,?)',
      [uid, date, name, kcal, protein, carbs, fat, meal, now()]);
    persist();
    return rows('SELECT last_insert_rowid() AS id')[0].id;
  },

  'kalory:delete-food': async ({ id }) => {
    await ready();
    const uid = requireUid();
    run('DELETE FROM food_log WHERE id=? AND user_id=?', [id, uid]);
    persist();
    return true;
  },

  'kalory:get-day': async ({ date }) => {
    await ready();
    const uid = requireUid();
    const foods = rows('SELECT * FROM food_log WHERE user_id=? AND date=? ORDER BY id', [uid, date]);
    const w = rows('SELECT COALESCE(SUM(ml),0) AS total FROM water_log WHERE user_id=? AND date=?', [uid, date])[0];
    const done = rows('SELECT exercise FROM workout_log WHERE user_id=? AND date=?', [uid, date]).map((r) => r.exercise);
    return { foods, waterMl: Math.max(0, w.total), done };
  },

  'kalory:log-water': async ({ date, ml }) => {
    await ready();
    const uid = requireUid();
    run('INSERT INTO water_log(user_id, date, ml, created_at) VALUES(?,?,?,?)', [uid, date, ml, now()]);
    persist();
    const w = rows('SELECT COALESCE(SUM(ml),0) AS total FROM water_log WHERE user_id=? AND date=?', [uid, date])[0];
    return Math.max(0, w.total);
  },

  'kalory:toggle-exercise': async ({ date, exercise }) => {
    await ready();
    const uid = requireUid();
    const exists = rows('SELECT 1 AS ok FROM workout_log WHERE user_id=? AND date=? AND exercise=?', [uid, date, exercise]).length > 0;
    if (exists) run('DELETE FROM workout_log WHERE user_id=? AND date=? AND exercise=?', [uid, date, exercise]);
    else run('INSERT INTO workout_log(user_id, date, exercise) VALUES(?,?,?)', [uid, date, exercise]);
    persist();
    return !exists;
  },

  'kalory:unlock': async ({ id }) => {
    await ready();
    const uid = requireUid();
    const at = now();
    run('INSERT INTO achievement(user_id, id, unlocked_at) VALUES(?,?,?) ON CONFLICT(user_id, id) DO NOTHING', [uid, id, at]);
    persist();
    return at;
  },

  'kalory:stats': async () => {
    await ready();
    const uid = requireUid();
    const totalFoods = rows('SELECT COUNT(*) AS n FROM food_log WHERE user_id=?', [uid])[0].n;
    const days = rows(`
      SELECT COUNT(*) AS n FROM (
        SELECT date FROM food_log WHERE user_id=?
        UNION SELECT date FROM water_log WHERE user_id=? AND ml > 0
        UNION SELECT date FROM workout_log WHERE user_id=?
      )`, [uid, uid, uid]);
    return { totalFoods, activeDays: days[0].n };
  },

  'kalory:reset-all': async () => {
    await ready();
    const uid = requireUid();
    run('DELETE FROM user_profile WHERE user_id=?', [uid]);
    run('DELETE FROM food_log WHERE user_id=?', [uid]);
    run('DELETE FROM water_log WHERE user_id=?', [uid]);
    run('DELETE FROM workout_log WHERE user_id=?', [uid]);
    run('DELETE FROM achievement WHERE user_id=?', [uid]);
    persist();
    return true;
  },
};

function register(ipcMain) {
  for (const [channel, fn] of Object.entries(handlers)) {
    ipcMain.handle(channel, (_event, arg) => fn(arg));
  }
}

function flush() {
  persist();
  try {
    if (db) db.close();
  } catch { /* ignore */ }
  db = null;
}

module.exports = { register, flush };
