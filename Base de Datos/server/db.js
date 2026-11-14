/**
 * Kalory API — capa de datos PostgreSQL (Neon u otro).
 *
 * Reemplaza al archivo SQLite efímero de Render (/tmp): la base vive en un
 * Postgres gestionado (Neon free tier), así la cuenta, el perfil y TODOS los
 * datos sobreviven a reinicios y redespliegues del servicio en Render free.
 *
 * Variables de entorno:
 *   DATABASE_URL  → postgresql://usuario:clave@host/base?sslmode=require
 *   PGSSL         → "disable" para Postgres local sin TLS (por defecto TLS con
 *                   certificado no verificado, como exige Neon)
 */
const { Pool } = require('pg');

let pool = null;
let readyOnce = null;

// Esquema idempotente (se ejecuta en cada arranque; CREATE IF NOT EXISTS es seguro).
// Fechas como TEXT ('YYYY-MM-DD'): la app las compara como cadenas y así el
// comportamiento es idéntico al de SQLite sin conversiones de tipo.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  pwd_hash TEXT,
  pwd_salt TEXT,
  google_sub TEXT UNIQUE,
  provider TEXT NOT NULL DEFAULT 'local',
  invite_code TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE TABLE IF NOT EXISTS user_profile(
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_json TEXT NOT NULL,
  targets_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS food_log(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  kcal DOUBLE PRECISION NOT NULL DEFAULT 0,
  protein DOUBLE PRECISION NOT NULL DEFAULT 0,
  carbs DOUBLE PRECISION NOT NULL DEFAULT 0,
  fat DOUBLE PRECISION NOT NULL DEFAULT 0,
  meal TEXT NOT NULL DEFAULT 'extra',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS water_log(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  ml INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workout_log(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  exercise TEXT NOT NULL,
  PRIMARY KEY(user_id, date, exercise)
);
CREATE TABLE IF NOT EXISTS achievement(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY(user_id, id)
);
CREATE TABLE IF NOT EXISTS weight_log(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, date)
);
CREATE TABLE IF NOT EXISTS friendships(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, date);
`;

const crypto = require('crypto');
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I/L
function genInviteCodeDb(existing) {
  for (let i = 0; i < 30; i++) {
    let code = 'KAL-';
    for (const b of crypto.randomBytes(6)) code += INVITE_ALPHABET[b % INVITE_ALPHABET.length];
    if (!existing.has(code)) { existing.add(code); return code; }
  }
  throw new Error('invite_code_agotado');
}

/** Migración única: códigos de invitación aleatorios para cuentas viejas sin uno. */
async function backfillInviteCodes(p) {
  const missing = await p.query('SELECT id FROM users WHERE invite_code IS NULL');
  if (!missing.rows.length) return;
  const taken = await p.query('SELECT invite_code FROM users WHERE invite_code IS NOT NULL');
  const existing = new Set(taken.rows.map((r) => r.invite_code));
  for (const r of missing.rows) {
    await p.query('UPDATE users SET invite_code=$1 WHERE id=$2', [genInviteCodeDb(existing), r.id]);
  }
}

async function ready() {
  if (!readyOnce) {
    readyOnce = (async () => {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error('[db] Falta DATABASE_URL (cadena de conexión de Postgres, p. ej. Neon). Defínela en el entorno (ver .env.example / Render → Environment).');
      }
      pool = new Pool({
        connectionString: url,
        // Neon exige TLS; su certificado no pasa el verificador estricto por defecto.
        ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 15_000,
      });
      pool.on('error', (e) => console.error('[db] error de pool:', e.message));
      await pool.query(SCHEMA);
      try { await backfillInviteCodes(pool); } catch (e) { console.error('[db] invite_code:', e.message); }
      return pool;
    })().catch((e) => { readyOnce = null; throw e; });
  }
  return readyOnce;
}

/** Ejecuta una consulta con placeholders $1..$n y devuelve las filas. */
async function q(text, params = []) {
  const p = await ready();
  const r = await p.query(text, params);
  return r.rows;
}

/** Igual que q() pero devuelve la primera fila (o undefined). */
async function q1(text, params = []) {
  return (await q(text, params))[0];
}

/** Ejecuta una escritura sin devolver filas de datos. */
async function run(text, params = []) {
  await q(text, params);
}

module.exports = { ready, q, q1, run };
