-- Private Storage bucket for Hosted Runs v1 artifacts (H3/H5).
-- Reads/writes use service role from server/worker only; no public bucket access.

INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', false)
ON CONFLICT (id) DO NOTHING;
