-- AI Generated Tattoos table
-- Stores all AI-generated tattoo images for gallery display and AI reference
CREATE TABLE IF NOT EXISTS ai_generated_tattoos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- Generation params
    prompt TEXT NOT NULL,
    flux_prompt TEXT,              -- Enhanced English prompt (from Qwen or fallback)
    style TEXT NOT NULL DEFAULT 'minimal',
    body_part TEXT,                -- null = flat design, non-null = body tryon
    generation_type TEXT NOT NULL DEFAULT 'design', -- 'design' | 'tryon' | 'direct'
    -- Image storage
    storage_path TEXT NOT NULL,    -- Supabase Storage path (ai-tattoos/{uuid})
    -- Engagement
    likes_count INT NOT NULL DEFAULT 0,
    views_count INT NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT true,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for homepage queries
CREATE INDEX idx_ai_tattoos_public_created ON ai_generated_tattoos(is_public, created_at DESC)
    WHERE is_public = true;
CREATE INDEX idx_ai_tattoos_style ON ai_generated_tattoos(style)
    WHERE is_public = true;
CREATE INDEX idx_ai_tattoos_likes ON ai_generated_tattoos(likes_count DESC)
    WHERE is_public = true;
CREATE INDEX idx_ai_tattoos_user ON ai_generated_tattoos(user_id);

-- RLS
ALTER TABLE ai_generated_tattoos ENABLE ROW LEVEL SECURITY;

-- Anyone can read public tattoos
CREATE POLICY "Public AI tattoos are viewable by everyone"
    ON ai_generated_tattoos FOR SELECT
    USING (is_public = true);

-- Authenticated users can read their own (including private)
CREATE POLICY "Users can view own AI tattoos"
    ON ai_generated_tattoos FOR SELECT
    USING (auth.uid() = user_id);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can create AI tattoos"
    ON ai_generated_tattoos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own
CREATE POLICY "Users can update own AI tattoos"
    ON ai_generated_tattoos FOR UPDATE
    USING (auth.uid() = user_id);
