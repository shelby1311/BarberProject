-- Schema compatível com SQLite (local) e PostgreSQL (produção)
-- Para PostgreSQL: TEXT PRIMARY KEY -> UUID PRIMARY KEY DEFAULT gen_random_uuid()
--                  INTEGER -> INTEGER (igual)
--                  TEXT (datas) -> TIMESTAMPTZ

CREATE TABLE IF NOT EXISTS barbers (
  id          TEXT PRIMARY KEY,
  cpf         TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  location    TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  bio         TEXT NOT NULL,
  cover_url   TEXT NOT NULL,
  avatar_url  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id               TEXT PRIMARY KEY,
  barber_id        TEXT NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  price_in_cents   INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id           TEXT PRIMARY KEY,
  barber_id    TEXT NOT NULL REFERENCES barbers(id),
  service_id   TEXT NOT NULL REFERENCES services(id),
  client_name  TEXT NOT NULL,
  starts_at    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_barber_date
  ON appointments(barber_id, starts_at);
