-- Kalory · Esquema SQLite (servidor online y app local comparten este modelo)
-- Tablas: users, user_profile, food_log, water_log, workout_log, achievement

CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pwd_hash TEXT,              -- NULL si solo entra con Google
  pwd_salt TEXT,
  google_sub TEXT UNIQUE,     -- ID único de Google (NULL si es solo local)
  provider TEXT NOT NULL DEFAULT 'local',  -- local | google | local+google
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile(
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  profile_json TEXT NOT NULL,  -- UserProfile completo (medidas, objetivo, dieta…)
  targets_json TEXT NOT NULL   -- MacroTargets (kcal, macros, agua)
);

CREATE TABLE IF NOT EXISTS food_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,          -- YYYY-MM-DD (fecha local del usuario)
  name TEXT NOT NULL,
  kcal REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  meal TEXT NOT NULL DEFAULT 'extra',  -- Desayuno|Almuerzo|Cena|Snack|Extra
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS water_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  ml INTEGER NOT NULL,         -- admite negativos (correcciones)
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_log(
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  exercise TEXT NOT NULL,
  PRIMARY KEY(user_id, date, exercise)
);

CREATE TABLE IF NOT EXISTS achievement(
  user_id INTEGER NOT NULL REFERENCES users(id),
  id TEXT NOT NULL,            -- primer_paso, hidratado, sesion_completa…
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY(user_id, id)
);

CREATE TABLE IF NOT EXISTS weight_log(
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,          -- YYYY-MM-DD
  weight REAL NOT NULL,        -- kg
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, date);

CREATE TABLE IF NOT EXISTS friendships(
  user_id INTEGER NOT NULL REFERENCES users(id),
  friend_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, friend_id)
);
