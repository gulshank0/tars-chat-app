package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/models"
	"github.com/lib/pq"
)

// ReelRepo handles reels database operations.
type ReelRepo struct {
	db *sql.DB
}

// NewReelRepo creates a new ReelRepo.
func NewReelRepo(db *sql.DB) *ReelRepo {
	return &ReelRepo{db: db}
}

// Create inserts a new reel.
func (r *ReelRepo) Create(ctx context.Context, reel *models.Reel) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO reels (creator_id, video_url, caption, duration_ms, width, height, hashtags, status, is_published)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`, reel.CreatorID, reel.VideoURL, reel.Caption, reel.DurationMs,
		reel.Width, reel.Height, pq.StringArray(reel.Hashtags), reel.Status, reel.IsPublished,
	).Scan(&reel.ID, &reel.CreatedAt, &reel.UpdatedAt)
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
	return err
}

// Delete removes a reel.
func (r *ReelRepo) Delete(ctx context.Context, id, creatorID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM reels WHERE id = $1 AND creator_id = $2`, id, creatorID)
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

	// Simple feed: reels from followed users + trending, scored by recency and engagement
	query := `
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
		LIMIT $2
	`

	if cursor != nil {
		// For simplicity, use offset-style cursor for the ranked feed
		// (a proper implementation would use pre-computed feeds in Redis)
		rows, err = r.db.QueryContext(ctx, query, userID, limit)
	} else {
		rows, err = r.db.QueryContext(ctx, query, userID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanReels(rows)
}

// GetTrending returns trending reels in the last 48 hours.
func (r *ReelRepo) GetTrending(ctx context.Context, limit int) ([]models.Reel, error) {
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
