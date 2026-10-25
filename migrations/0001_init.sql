-- Schema D1 di Emporio 46. Le istruzioni sono idempotenti: il Worker le esegue anche da solo al primo avvio.

-- Contenuti gestiti dal pannello admin (impostazioni, catalogo, recensioni, SEO): una sola riga id = 'main'.
CREATE TABLE IF NOT EXISTS site_data (
  id         TEXT PRIMARY KEY,
  rev        TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Password admin cambiata dal pannello (solo hash PBKDF2 + salt, mai in chiaro).
CREATE TABLE IF NOT EXISTS admin_auth (
  id         TEXT PRIMARY KEY,
  salt       TEXT NOT NULL,
  hash       TEXT NOT NULL,
  iter       INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
