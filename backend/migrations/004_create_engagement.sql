-- 004_create_engagement.sql
-- Likes, comments, saves, views

CREATE TABLE IF NOT EXISTS reel_likes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id    UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_reel ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON reel_likes(user_id);

CREATE TABLE IF NOT EXISTS reel_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id         UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES reel_comments(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    like_count      INT DEFAULT 0,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_reel ON reel_comments(reel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON reel_comments(parent_id);

CREATE TABLE IF NOT EXISTS reel_saves (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id    UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_user ON reel_saves(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reel_views (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id        UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id        UUID REFERENCES user_profiles(id),
    watch_duration INT DEFAULT 0,
    completed      BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_views_reel ON reel_views(reel_id);
CREATE INDEX IF NOT EXISTS idx_views_user ON reel_views(user_id, created_at DESC);
