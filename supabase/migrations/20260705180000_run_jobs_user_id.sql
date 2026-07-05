-- Attribute hosted run jobs to the Supabase Auth user who launched them, so the
-- run gate can enforce a per-user daily quota instead of a shared beta code.
-- Nullable: pre-auth jobs and script/CLI bypass jobs carry no user.

ALTER TABLE run_jobs
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Per-user daily quota counts jobs for one user since the start of the UTC day.
CREATE INDEX IF NOT EXISTS run_jobs_user_created_idx
  ON run_jobs (user_id, created_at DESC);
