package repository

import (
	"context"
	"database/sql"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/models"
	"github.com/gulshan/tars-social/pkg/cache"
	"github.com/lib/pq"
)

const (
	trendingCacheKey  = "trending:reels"
	trendingCacheTTL  = 2 * time.Minute
	hashtagsCacheKey  = "popular:hashtags"
	hashtagsCacheTTL  = 5 * time.Minute
)

// ReelRepo handles reels database operations with Redis caching.
type ReelRepo struct {
	db  *sql.DB
	rdb *cache.RedisClient
}

// NewReelRepo creates a new ReelRepo.
func NewReelRepo(db *sql.DB) *ReelRepo {
	return &ReelRepo{db: db}
}

// SetRedis sets the Redis client for caching.
func (r *ReelRepo) SetRedis(rdb *cache.RedisClient) {
	r.rdb = rdb
}

// Create inserts a new reel and invalidates trending cache.
func (r *ReelRepo) Create(ctx context.Context, reel *models.Reel) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO reels (creator_id, video_url, caption, duration_ms, width, height, hashtags, status, is_published)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`, reel.CreatorID, reel.VideoURL, reel.Caption, reel.DurationMs,
		reel.Width, reel.Height, pq.StringArray(reel.Hashtags), reel.Status, reel.IsPublished,
	).Scan(&reel.ID, &reel.CreatedAt, &reel.UpdatedAt)

	if err == nil && r.rdb != nil {
		// Invalidate trending cache since new content was added
		_ = r.rdb.Del(ctx, trendingCacheKey)
	}

	return err
}

// GetByID finds a reel by UUID.
func (r *ReelRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Reel, error) {
	var reel models.Reel
	err := r.db.QueryRowContext(ctx, `
		SELECT id, creator_id, video_url, thumbnail_url, caption, audio_id, duration_ms,
		       width, height, is_published, is_instagram, ig_media_id, view_count,
		       like_count, comment_count, share_count, save_count, hashtags, status,
		       created_at, updated_at
		FROM reels WHERE id = $1
	`, id).Scan(
		&reel.ID, &reel.CreatorID, &reel.VideoURL, &reel.ThumbnailURL, &reel.Caption,
		&reel.AudioID, &reel.DurationMs, &reel.Width, &reel.Height, &reel.IsPublished,
		&reel.IsInstagram, &reel.IGMediaID, &reel.ViewCount, &reel.LikeCount,
		&reel.CommentCount, &reel.ShareCount, &reel.SaveCount, &reel.Hashtags,
		&reel.Status, &reel.CreatedAt, &reel.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &reel, err
}

// UpdateStatus sets the reel status (used after processing).
func (r *ReelRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status models.ReelStatus, thumbnailURL *string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE reels SET status = $1, thumbnail_url = $2, is_published = CASE WHEN $1 = 'ready' THEN TRUE ELSE is_published END, updated_at = NOW()
		WHERE id = $3
	`, status, thumbnailURL, id)

	if err == nil && r.rdb != nil {
		_ = r.rdb.Del(ctx, trendingCacheKey)
	}

	return err
}

// Delete removes a reel.
func (r *ReelRepo) Delete(ctx context.Context, id, creatorID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM reels WHERE id = $1 AND creator_id = $2`, id, creatorID)

	if err == nil && r.rdb != nil {
		_ = r.rdb.Del(ctx, trendingCacheKey)
	}

	return err
}

// GetByCreator returns reels created by a user.
func (r *ReelRepo) GetByCreator(ctx context.Context, creatorID uuid.UUID, cursor *string, limit int) ([]models.Reel, error) {
	var rows *sql.Rows
	var err error

	if cursor != nil {
		cursorID, _ := uuid.Parse(*cursor)
		rows, err = r.db.QueryContext(ctx, `
			SELECT id, creator_id, video_url, thumbnail_url, caption, audio_id, duration_ms,
			       width, height, is_published, is_instagram, ig_media_id, view_count,
			       like_count, comment_count, share_count, save_count, hashtags, status,
			       created_at, updated_at
			FROM reels WHERE creator_id = $1 AND status = 'ready' AND is_published = TRUE AND id < $2
			ORDER BY created_at DESC LIMIT $3
		`, creatorID, cursorID, limit)
	} else {
		rows, err = r.db.QueryContext(ctx, `
			SELECT id, creator_id, video_url, thumbnail_url, caption, audio_id, duration_ms,
			       width, height, is_published, is_instagram, ig_media_id, view_count,
			       like_count, comment_count, share_count, save_count, hashtags, status,
			       created_at, updated_at
			FROM reels WHERE creator_id = $1 AND status = 'ready' AND is_published = TRUE
			ORDER BY created_at DESC LIMIT $2
		`, creatorID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanReels(rows)
}

// GetFeed returns personalized feed reels for a user.
func (r *ReelRepo) GetFeed(ctx context.Context, userID uuid.UUID, cursor *string, limit int) ([]models.Reel, error) {
	var rows *sql.Rows
	var err error

	// Parse cursor as integer offset (ranked feed can't use ID-based cursors)
	offset := 0
	if cursor != nil {
		if parsed, parseErr := strconv.Atoi(*cursor); parseErr == nil && parsed > 0 {
			offset = parsed
		}
	}

	// Feed: reels from followed users + trending, scored by recency and engagement
	rows, err = r.db.QueryContext(ctx, `
		SELECT r.id, r.creator_id, r.video_url, r.thumbnail_url, r.caption, r.audio_id,
		       r.duration_ms, r.width, r.height, r.is_published, r.is_instagram, r.ig_media_id,
		       r.view_count, r.like_count, r.comment_count, r.share_count, r.save_count,
		       r.hashtags, r.status, r.created_at, r.updated_at
		FROM reels r
		LEFT JOIN follows f ON f.following_id = r.creator_id AND f.follower_id = $1
		WHERE r.status = 'ready' AND r.is_published = TRUE
		ORDER BY
			(CASE WHEN f.follower_id IS NOT NULL THEN 0.35 ELSE 0 END) +
			(LEAST(r.like_count * 2 + r.comment_count * 3 + r.share_count * 5, 10000) / 10000.0 * 0.25) +
			(1.0 / GREATEST(EXTRACT(EPOCH FROM NOW() - r.created_at) / 3600, 1) * 0.10)
			DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanReels(rows)
}

// GetTrending returns trending reels (cached in Redis for 2 minutes).
func (r *ReelRepo) GetTrending(ctx context.Context, limit int) ([]models.Reel, error) {
	// Try Redis cache first
	if r.rdb != nil {
		var cached []models.Reel
		found, err := r.rdb.GetJSON(ctx, trendingCacheKey, &cached)
		if err == nil && found && len(cached) > 0 {
			return cached, nil
		}
	}

	// Try last 48 hours first
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, creator_id, video_url, thumbnail_url, caption, audio_id, duration_ms,
		       width, height, is_published, is_instagram, ig_media_id, view_count,
		       like_count, comment_count, share_count, save_count, hashtags, status,
		       created_at, updated_at
		FROM reels
		WHERE status = 'ready' AND is_published = TRUE
		  AND created_at > NOW() - INTERVAL '48 hours'
		ORDER BY (like_count * 2 + comment_count * 3 + share_count * 5) /
		         GREATEST(EXTRACT(EPOCH FROM NOW() - created_at) / 3600, 1) DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reels, err := scanReels(rows)
	if err != nil {
		return nil, err
	}

	// Fallback to all-time if no recent trending reels
	if len(reels) == 0 {
		rows2, err2 := r.db.QueryContext(ctx, `
			SELECT id, creator_id, video_url, thumbnail_url, caption, audio_id, duration_ms,
			       width, height, is_published, is_instagram, ig_media_id, view_count,
			       like_count, comment_count, share_count, save_count, hashtags, status,
			       created_at, updated_at
			FROM reels
			WHERE status = 'ready' AND is_published = TRUE
			ORDER BY (like_count * 2 + comment_count * 3 + share_count * 5) DESC,
			         created_at DESC
			LIMIT $1
		`, limit)
		if err2 != nil {
			return nil, err2
		}
		defer rows2.Close()
		reels, err = scanReels(rows2)
		if err != nil {
			return nil, err
		}
	}

	// Cache the result in Redis
	if r.rdb != nil && len(reels) > 0 {
		_ = r.rdb.SetJSON(ctx, trendingCacheKey, reels, trendingCacheTTL)
	}

	return reels, nil
}

// SearchByHashtag returns reels matching a given hashtag.
func (r *ReelRepo) SearchByHashtag(ctx context.Context, tag string, limit int) ([]models.Reel, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, creator_id, video_url, thumbnail_url, caption, audio_id, duration_ms,
		       width, height, is_published, is_instagram, ig_media_id, view_count,
		       like_count, comment_count, share_count, save_count, hashtags, status,
		       created_at, updated_at
		FROM reels
		WHERE status = 'ready' AND is_published = TRUE
		  AND hashtags @> ARRAY[$1]::TEXT[]
		ORDER BY (like_count * 2 + comment_count * 3 + share_count * 5) DESC
		LIMIT $2
	`, tag, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanReels(rows)
}

func scanReels(rows *sql.Rows) ([]models.Reel, error) {
	var reels []models.Reel
	for rows.Next() {
		var reel models.Reel
		if err := rows.Scan(
			&reel.ID, &reel.CreatorID, &reel.VideoURL, &reel.ThumbnailURL, &reel.Caption,
			&reel.AudioID, &reel.DurationMs, &reel.Width, &reel.Height, &reel.IsPublished,
			&reel.IsInstagram, &reel.IGMediaID, &reel.ViewCount, &reel.LikeCount,
			&reel.CommentCount, &reel.ShareCount, &reel.SaveCount, &reel.Hashtags,
			&reel.Status, &reel.CreatedAt, &reel.UpdatedAt,
		); err != nil {
			return nil, err
		}
		reels = append(reels, reel)
	}
	return reels, rows.Err()
}

// UpsertHashtags inserts or increments hashtags in the hashtags table.
func (r *ReelRepo) UpsertHashtags(ctx context.Context, tags []string) error {
	for _, tag := range tags {
		if tag == "" {
			continue
		}
		_, err := r.db.ExecContext(ctx, `
			INSERT INTO hashtags (tag, reel_count) VALUES ($1, 1)
			ON CONFLICT (tag) DO UPDATE SET reel_count = hashtags.reel_count + 1
		`, tag)
		if err != nil {
			return err
		}
	}

	// Invalidate hashtags cache
	if r.rdb != nil {
		_ = r.rdb.Del(ctx, hashtagsCacheKey)
	}

	return nil
}

// Hashtag represents a popular hashtag.
type Hashtag struct {
	ID        uuid.UUID `json:"id"`
	Tag       string    `json:"tag"`
	ReelCount int64     `json:"reelCount"`
}

// GetPopularHashtags returns the most popular hashtags by reel count (cached).
func (r *ReelRepo) GetPopularHashtags(ctx context.Context, limit int) ([]Hashtag, error) {
	// Try Redis cache first
	if r.rdb != nil {
		var cached []Hashtag
		found, err := r.rdb.GetJSON(ctx, hashtagsCacheKey, &cached)
		if err == nil && found && len(cached) > 0 {
			return cached, nil
		}
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, tag, reel_count FROM hashtags
		WHERE reel_count > 0
		ORDER BY reel_count DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hashtags []Hashtag
	for rows.Next() {
		var h Hashtag
		if err := rows.Scan(&h.ID, &h.Tag, &h.ReelCount); err != nil {
			return nil, err
		}
		hashtags = append(hashtags, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Cache the result
	if r.rdb != nil && len(hashtags) > 0 {
		_ = r.rdb.SetJSON(ctx, hashtagsCacheKey, hashtags, hashtagsCacheTTL)
	}

	return hashtags, nil
}

// IncrementShareCount atomically increments the share_count on a reel.
func (r *ReelRepo) IncrementShareCount(ctx context.Context, reelID uuid.UUID) (bool, error) {
	result, err := r.db.ExecContext(ctx, `UPDATE reels SET share_count = share_count + 1 WHERE id = $1`, reelID)
	if err != nil {
		return false, err
	}
	rows, _ := result.RowsAffected()

	// Invalidate trending since engagement changed
	if r.rdb != nil && rows > 0 {
		_ = r.rdb.Del(ctx, trendingCacheKey)
	}

	return rows > 0, nil
}

// GetByIGMediaID finds a reel by its Instagram media ID (to prevent duplicate imports).
func (r *ReelRepo) GetByIGMediaID(ctx context.Context, igMediaID string) (*models.Reel, error) {
	var reel models.Reel
	err := r.db.QueryRowContext(ctx, `
		SELECT id, creator_id, video_url, thumbnail_url, caption, audio_id,
		       duration_ms, width, height, is_published, is_instagram, ig_media_id,
		       view_count, like_count, comment_count, share_count, save_count,
		       hashtags, status, created_at, updated_at
		FROM reels WHERE ig_media_id = $1
	`, igMediaID).Scan(
		&reel.ID, &reel.CreatorID, &reel.VideoURL, &reel.ThumbnailURL,
		&reel.Caption, &reel.AudioID, &reel.DurationMs, &reel.Width, &reel.Height,
		&reel.IsPublished, &reel.IsInstagram, &reel.IGMediaID,
		&reel.ViewCount, &reel.LikeCount, &reel.CommentCount, &reel.ShareCount, &reel.SaveCount,
		pq.Array(&reel.Hashtags), &reel.Status, &reel.CreatedAt, &reel.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &reel, nil
}
