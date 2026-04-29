-- Add reports_count column to posts and trigger to maintain it from `reports` table.
-- Reports already exist as a polymorphic table (reportable_type, reportable_id).
-- We mirror the post-scoped count onto posts.reports_count so the detail page
-- can render the badge without an extra aggregation query.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS reports_count integer NOT NULL DEFAULT 0;

-- Prevent duplicate reports per (reporter, post)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_post_reporter_unique
  ON reports (reportable_id, reporter_id)
  WHERE reportable_type = 'post';

CREATE INDEX IF NOT EXISTS idx_reports_reportable
  ON reports (reportable_type, reportable_id);

-- Trigger function: maintain posts.reports_count
CREATE OR REPLACE FUNCTION trg_post_reports_count_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reportable_type = 'post' THEN
      UPDATE posts SET reports_count = reports_count + 1 WHERE id = NEW.reportable_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reportable_type = 'post' THEN
      UPDATE posts SET reports_count = GREATEST(reports_count - 1, 0) WHERE id = OLD.reportable_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_reports_count ON reports;
CREATE TRIGGER trg_post_reports_count
  AFTER INSERT OR DELETE ON reports
  FOR EACH ROW EXECUTE FUNCTION trg_post_reports_count_fn();

-- Backfill from existing rows
UPDATE posts p
SET reports_count = sub.cnt
FROM (
  SELECT reportable_id AS post_id, COUNT(*)::int AS cnt
  FROM reports
  WHERE reportable_type = 'post'
  GROUP BY reportable_id
) sub
WHERE p.id = sub.post_id;

-- RLS: ensure reports table allows authenticated insert with reporter_id = auth.uid()
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_auth" ON reports;
CREATE POLICY "reports_insert_auth" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports FOR SELECT
  USING (auth.uid() = reporter_id);
