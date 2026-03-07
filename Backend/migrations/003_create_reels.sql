-- 003_create_reels.sql
-- Reels and audio tracks

CREATE TABLE IF NOT EXISTS audio_tracks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    artist      VARCHAR(255),
    audio_url   TEXT NOT NULL,
    duration_ms INT,
    use_count   BIGINT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    video_url       TEXT NOT NULL,
    thumbnail_url   TEXT,
    caption         TEXT DEFAULT '',
    audio_id        UUID REFERENCES audio_tracks(id),
    duration_ms     INT NOT NULL,
    width           INT,
    height          INT,
    is_published    BOOLEAN DEFAULT FALSE,
    is_instagram    BOOLEAN DEFAULT FALSE,
    ig_media_id     VARCHAR(255),
    view_count      BIGINT DEFAULT 0,
    like_count      BIGINT DEFAULT 0,
    comment_count   BIGINT DEFAULT 0,
    share_count     BIGINT DEFAULT 0,
    save_count      BIGINT DEFAULT 0,
    hashtags        TEXT[] DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'processing',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reels_creator ON reels(creator_id);
CREATE INDEX IF NOT EXISTS idx_reels_status ON reels(status, is_published);
CREATE INDEX IF NOT EXISTS idx_reels_created ON reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_hashtags ON reels USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_reels_trending ON reels(like_count DESC, view_count DESC)
    WHERE status = 'ready' AND is_published = TRUE;
