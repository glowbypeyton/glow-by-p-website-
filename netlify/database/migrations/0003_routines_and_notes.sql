-- Phase 3: Routines, visit notes, and progress photos
-- Netlify applies this automatically on deploy.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS am_routine TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pm_routine TEXT;

CREATE TABLE IF NOT EXISTS visit_notes (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  note TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_notes_client_id ON visit_notes (client_id, created_at DESC);
