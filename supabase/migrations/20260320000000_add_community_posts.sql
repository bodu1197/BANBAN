-- Add community columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS type_board text NOT NULL DEFAULT 'QNA';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS type_post text NOT NULL DEFAULT 'TATTOO';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS type_artist text NOT NULL DEFAULT 'TATTOO';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS legacy_id bigint;

-- Create post_media table
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create post_views table
CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_type_board_created ON posts(type_board, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type_board_popular ON posts(type_board, deleted_at, views_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type_post ON posts(type_post);
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id, order_index);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_views_user ON post_views(post_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_views_ip ON post_views(post_id, ip_address) WHERE ip_address IS NOT NULL AND user_id IS NULL;

-- RLS for posts (already exists but ensure policies)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select_all" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "posts_insert_auth" ON posts;
CREATE POLICY "posts_insert_auth" ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for post_media
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_media_select_all" ON post_media FOR SELECT USING (true);

CREATE POLICY "post_media_insert_auth" ON post_media FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()));

CREATE POLICY "post_media_delete_own" ON post_media FOR DELETE
  USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()));

-- RLS for post_views
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_views_select_all" ON post_views FOR SELECT USING (true);

CREATE POLICY "post_views_insert_all" ON post_views FOR INSERT WITH CHECK (true);

-- RLS for comments (ensure)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_all" ON comments;
CREATE POLICY "comments_select_all" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments_insert_auth" ON comments;
CREATE POLICY "comments_insert_auth" ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_update_own" ON comments;
CREATE POLICY "comments_update_own" ON comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  USING (auth.uid() = user_id);
