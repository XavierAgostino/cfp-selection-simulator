-- Hosted Runs v1 metadata schema (H2)
-- Payloads live in object storage (H3+). Server/worker uses service-role DB access.

CREATE TABLE IF NOT EXISTS run_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (
    status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  requested_season INT NOT NULL,
  requested_week INT NOT NULL,
  requested_source TEXT NOT NULL CHECK (requested_source IN ('sample', 'cfbd')),
  requested_ruleset TEXT,
  scenario_weights_json JSONB,
  run_stem TEXT,
  artifact_base_url TEXT,
  error_message TEXT,
  logs_text TEXT NOT NULL DEFAULT '',
  pid INT,
  exit_code INT,
  trigger_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS run_jobs_status_created_idx
  ON run_jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS run_jobs_created_at_idx
  ON run_jobs (created_at DESC);

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stem TEXT UNIQUE NOT NULL,
  season INT NOT NULL,
  week INT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('sample', 'cfbd')),
  ruleset TEXT,
  scenario_id TEXT NOT NULL DEFAULT 'base',
  label TEXT,
  config_hash TEXT,
  artifact_base_url TEXT NOT NULL,
  manifest_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runs_season_week_idx
  ON runs (season DESC, week DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_run_stem TEXT NOT NULL REFERENCES runs (stem) ON DELETE CASCADE,
  scenario_run_stem TEXT UNIQUE NOT NULL,
  weights_json JSONB NOT NULL,
  artifact_base_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: block PostgREST/Data API access; service-role direct connections bypass RLS.
ALTER TABLE run_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON run_jobs FROM anon, authenticated;
REVOKE ALL ON runs FROM anon, authenticated;
REVOKE ALL ON scenarios FROM anon, authenticated;
