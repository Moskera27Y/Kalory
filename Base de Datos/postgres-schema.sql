-- Kalory · Esquema PostgreSQL (cuando se supere la capacidad del archivo SQLite)
-- Migración: exportar cada tabla de SQLite e importar aquí (mismos nombres/columnas).

CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email CITEXT UNIQUE NOT NULL,
  pwd_hash TEXT,
  pwd_salt TEXT,
  google_sub TEXT UNIQUE,
  provider TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profile(
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_json JSONB NOT NULL,
  targets_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS food_log(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  kcal DOUBLE PRECISION NOT NULL DEFAULT 0,
  protein DOUBLE PRECISION NOT NULL DEFAULT 0,
  carbs DOUBLE PRECISION NOT NULL DEFAULT 0,
  fat DOUBLE PRECISION NOT NULL DEFAULT 0,
  meal TEXT NOT NULL DEFAULT 'extra',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_log(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ml INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_log(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exercise TEXT NOT NULL,
  PRIMARY KEY(user_id, date, exercise)
);

CREATE TABLE IF NOT EXISTS achievement(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, id)
);

CREATE TABLE IF NOT EXISTS weight_log(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, date);
