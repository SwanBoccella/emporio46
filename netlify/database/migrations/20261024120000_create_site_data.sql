-- Contenuti del sito gestiti dal pannello admin (impostazioni, catalogo, recensioni, SEO).
-- Una sola riga (id = 'main') con l'ultimo salvataggio completo.
CREATE TABLE site_data (
  id         TEXT PRIMARY KEY,
  rev        TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
