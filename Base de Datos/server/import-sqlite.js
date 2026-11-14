/**
 * Importa una base kalory-online.db (SQLite) a PostgreSQL SIN perder nada:
 * usuarios (mismos ids → los JWT viejos siguen valiendo si el JWT_SECRET no
 * cambia), perfiles, comidas, agua, entrenos, medallas, pesos y amistades.
 *
 * Uso:
 *   DATABASE_URL=postgresql://... node import-sqlite.js [ruta-al-kalory-online.db]
 *
 * - Es seguro repetirlo: usa ON CONFLICT … DO UPDATE (idempotente).
 * - Al terminar ajusta las secuencias de ids.
 * - Imprime SOLO contadores (nunca email ni nombres).
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

// Si no hay DATABASE_URL en el entorno, se intenta cargar ../.env (nunca pisa
// variables ya definidas en el entorno).
if (!process.env.DATABASE_URL) {
  try {
    const envFile = path.join(__dirname, '..', '.env');
    for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i <= 0) continue;
      const k = line.slice(0, i).trim();
      if (process.env[k] === undefined) process.env[k] = line.slice(i + 1);
    }
  } catch { /* sin .env: se exige la variable */ }
}

const src = process.argv[2] || path.join(__dirname, 'data', 'kalory-online.db');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL (cadena de conexión de Postgres, p. ej. Neon).');
  process.exit(1);
}

(async () => {
  if (!fs.existsSync(src)) {
    console.error('No existe el archivo SQLite: ' + src);
    process.exit(1);
  }
  const SQL = await initSqlJs({ locateFile: (f) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f) });
  const sqlite = new SQL.Database(fs.readFileSync(src));
  const rowsOf = (t) => {
    try {
      const r = sqlite.exec(`SELECT * FROM ${t}`);
      if (!r.length) return [];
      const { columns, values } = r[0];
      return values.map((v) => Object.fromEntries(columns.map((c, i) => [c, v[i]])));
    } catch (e) {
      console.warn(`· tabla ${t}: no se pudo leer (${e.message}), se omite`);
      return [];
    }
  };

  const pool = new Pool({
    connectionString: url,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    max: 2,
  });
  // Crear el esquema antes de importar
  const { ready } = require('./db');
  await ready();

  const report = {};
  const importTable = async (name, insert) => {
    const rows = rowsOf(name);
    for (const row of rows) await insert(row);
    report[name] = rows.length;
  };

  // Orden por FKs: primero users
  await importTable('users', (u) => pool.query(
    `INSERT INTO users(id,name,email,pwd_hash,pwd_salt,google_sub,provider,invite_code,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email,
       pwd_hash=excluded.pwd_hash, pwd_salt=excluded.pwd_salt, google_sub=excluded.google_sub,
       provider=excluded.provider, invite_code=excluded.invite_code, created_at=excluded.created_at`,
    [u.id, u.name, u.email, u.pwd_hash ?? null, u.pwd_salt ?? null, u.google_sub ?? null,
     u.provider || 'local', u.invite_code ?? null, u.created_at],
  ));
  await importTable('user_profile', (p) => pool.query(
    `INSERT INTO user_profile(user_id, profile_json, targets_json) VALUES($1,$2,$3)
     ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json, targets_json=excluded.targets_json`,
    [p.user_id, p.profile_json, p.targets_json],
  ));
  await importTable('food_log', (f) => pool.query(
    `INSERT INTO food_log(id,user_id,date,name,kcal,protein,carbs,fat,meal,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, date=excluded.date, name=excluded.name,
       kcal=excluded.kcal, protein=excluded.protein, carbs=excluded.carbs, fat=excluded.fat,
       meal=excluded.meal, created_at=excluded.created_at`,
    [f.id, f.user_id, f.date, f.name, f.kcal, f.protein, f.carbs, f.fat, f.meal, f.created_at],
  ));
  await importTable('water_log', (w) => pool.query(
    `INSERT INTO water_log(id,user_id,date,ml,created_at) VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, date=excluded.date, ml=excluded.ml, created_at=excluded.created_at`,
    [w.id, w.user_id, w.date, w.ml, w.created_at],
  ));
  await importTable('workout_log', (x) => pool.query(
    'INSERT INTO workout_log(user_id,date,exercise) VALUES($1,$2,$3) ON CONFLICT(user_id,date,exercise) DO NOTHING',
    [x.user_id, x.date, x.exercise],
  ));
  await importTable('achievement', (a) => pool.query(
    'INSERT INTO achievement(user_id,id,unlocked_at) VALUES($1,$2,$3) ON CONFLICT(user_id,id) DO NOTHING',
    [a.user_id, a.id, a.unlocked_at],
  ));
  await importTable('weight_log', (w) => pool.query(
    `INSERT INTO weight_log(user_id,date,weight,created_at) VALUES($1,$2,$3,$4)
     ON CONFLICT(user_id,date) DO UPDATE SET weight=excluded.weight, created_at=excluded.created_at`,
    [w.user_id, w.date, w.weight, w.created_at],
  ));
  await importTable('friendships', (f) => pool.query(
    'INSERT INTO friendships(user_id,friend_id,created_at) VALUES($1,$2,$3) ON CONFLICT(user_id,friend_id) DO NOTHING',
    [f.user_id, f.friend_id, f.created_at],
  ));

  // Reajustar secuencias para ids nuevos (users y food_log tienen SERIAL)
  await pool.query(`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))`);
  await pool.query(`SELECT setval('food_log_id_seq', COALESCE((SELECT MAX(id) FROM food_log), 1))`);
  await pool.query(`SELECT setval('water_log_id_seq', COALESCE((SELECT MAX(id) FROM water_log), 1))`);

  console.log('Importación completa:');
  for (const [t, n] of Object.entries(report)) console.log(`  ${t}: ${n} filas`);
  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message || e); process.exit(1); });
