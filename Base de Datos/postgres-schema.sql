-- Kalory · Esquema PostgreSQL (el servidor lo crea solo en cada arranque — ver server/db.js)
-- Fechas como TEXT 'YYYY-MM-DD': la app las compara como cadenas (idéntico a SQLite).
-- created_at: TEXT ISO 8601 (now()). JSON: TEXT (la app hace JSON.parse/stringify).

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
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
