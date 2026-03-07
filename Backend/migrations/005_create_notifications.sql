-- 005_create_notifications.sql
-- Notifications and hashtags

CREATE TABLE IF NOT EXISTS notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    actor_id      UUID REFERENCES user_profiles(id),
    type          VARCHAR(30) NOT NULL,
    entity_type   VARCHAR(20),
    entity_id     UUID,
    message       TEXT,
    is_read       BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS hashtags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag        VARCHAR(100) UNIQUE NOT NULL,
    reel_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_popular ON hashtags(reel_count DESC);

CREATE TABLE IF NOT EXISTS reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id   UUID NOT NULL REFERENCES user_profiles(id),
    entity_type   VARCHAR(20) NOT NULL,
    entity_id     UUID NOT NULL,
    reason        VARCHAR(50) NOT NULL,
    description   TEXT,
    status        VARCHAR(20) DEFAULT 'pending',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
