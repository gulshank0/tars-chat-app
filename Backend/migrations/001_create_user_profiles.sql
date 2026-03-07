-- 001_create_user_profiles.sql
-- Extended user profiles table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS user_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id        VARCHAR(255) UNIQUE NOT NULL,
    username        VARCHAR(50) UNIQUE NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    bio             TEXT DEFAULT '',
    avatar_url      TEXT,
    website         VARCHAR(500),
    is_verified     BOOLEAN DEFAULT FALSE,
    is_private      BOOLEAN DEFAULT FALSE,
    instagram_id    VARCHAR(255),
    ig_access_token TEXT,
    follower_count  INT DEFAULT 0,
    following_count INT DEFAULT 0,
    reel_count      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_clerk ON user_profiles(clerk_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_instagram ON user_profiles(instagram_id);
