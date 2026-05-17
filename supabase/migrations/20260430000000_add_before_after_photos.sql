-- Before/After treatment photos for artists
CREATE TABLE IF NOT EXISTS before_after_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT,
  before_image_path TEXT NOT NULL,
  after_image_path TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_before_after_photos_artist ON before_after_photos(artist_id);

ALTER TABLE before_after_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view before_after_photos"
  ON before_after_photos FOR SELECT USING (true);

CREATE POLICY "Artists can insert own before_after_photos"
  ON before_after_photos FOR INSERT
  WITH CHECK (artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid()));

CREATE POLICY "Artists can update own before_after_photos"
  ON before_after_photos FOR UPDATE
  USING (artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid()));

CREATE POLICY "Artists can delete own before_after_photos"
  ON before_after_photos FOR DELETE
  USING (artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid()));
