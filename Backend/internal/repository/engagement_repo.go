package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

// EngagementRepo handles likes, comments, saves, and views.
type EngagementRepo struct {
	db *sql.DB
}

// NewEngagementRepo creates a new EngagementRepo.
func NewEngagementRepo(db *sql.DB) *EngagementRepo {
	return &EngagementRepo{db: db}
}

// ---- LIKES ----

// LikeReel adds a like. Returns true if newly liked.
func (r *EngagementRepo) LikeReel(ctx context.Context, reelID, userID uuid.UUID) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		INSERT INTO reel_likes (reel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
	`, reelID, userID)
	if err != nil {
		return false, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return false, nil
	}

	_, err = tx.ExecContext(ctx, `UPDATE reels SET like_count = like_count + 1 WHERE id = $1`, reelID)
	if err != nil {
		return false, err
	}

	return true, tx.Commit()
}

// UnlikeReel removes a like. Returns true if removed.
func (r *EngagementRepo) UnlikeReel(ctx context.Context, reelID, userID uuid.UUID) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `DELETE FROM reel_likes WHERE reel_id = $1 AND user_id = $2`, reelID, userID)
	if err != nil {
		return false, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return false, nil
	}

	_, err = tx.ExecContext(ctx, `UPDATE reels SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, reelID)
	if err != nil {
		return false, err
	}

	return true, tx.Commit()
}

// IsLiked checks if a user has liked a reel.
func (r *EngagementRepo) IsLiked(ctx context.Context, reelID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM reel_likes WHERE reel_id = $1 AND user_id = $2)`, reelID, userID).Scan(&exists)
	return exists, err
}

// ---- SAVES ----

// SaveReel bookmarks a reel. Returns true if newly saved.
func (r *EngagementRepo) SaveReel(ctx context.Context, reelID, userID uuid.UUID) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		INSERT INTO reel_saves (reel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
	`, reelID, userID)
	if err != nil {
		return false, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return false, nil
	}

	_, err = tx.ExecContext(ctx, `UPDATE reels SET save_count = save_count + 1 WHERE id = $1`, reelID)
	if err != nil {
		return false, err
	}

	return true, tx.Commit()
}

// UnsaveReel removes a bookmark.
func (r *EngagementRepo) UnsaveReel(ctx context.Context, reelID, userID uuid.UUID) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `DELETE FROM reel_saves WHERE reel_id = $1 AND user_id = $2`, reelID, userID)
	if err != nil {
		return false, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return false, nil
	}

	_, err = tx.ExecContext(ctx, `UPDATE reels SET save_count = GREATEST(save_count - 1, 0) WHERE id = $1`, reelID)
	if err != nil {
		return false, err
	}

	return true, tx.Commit()
}

// IsSaved checks if a user has saved a reel.
func (r *EngagementRepo) IsSaved(ctx context.Context, reelID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM reel_saves WHERE reel_id = $1 AND user_id = $2)`, reelID, userID).Scan(&exists)
	return exists, err
}

// GetSavedReels returns reels saved by a user.
func (r *EngagementRepo) GetSavedReels(ctx context.Context, userID uuid.UUID, limit, offset int) ([]uuid.UUID, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT reel_id FROM reel_saves WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// ---- COMMENTS ----

// AddComment inserts a comment.
func (r *EngagementRepo) AddComment(ctx context.Context, reelID, userID uuid.UUID, content string, parentID *uuid.UUID) (uuid.UUID, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback()

	var id uuid.UUID
	err = tx.QueryRowContext(ctx, `
		INSERT INTO reel_comments (reel_id, user_id, content, parent_id)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, reelID, userID, content, parentID).Scan(&id)
	if err != nil {
		return uuid.Nil, err
	}

	_, err = tx.ExecContext(ctx, `UPDATE reels SET comment_count = comment_count + 1 WHERE id = $1`, reelID)
	if err != nil {
		return uuid.Nil, err
	}

	return id, tx.Commit()
}

// DeleteComment soft-deletes a comment.
func (r *EngagementRepo) DeleteComment(ctx context.Context, commentID, userID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE reel_comments SET is_deleted = TRUE, content = '' WHERE id = $1 AND user_id = $2
	`, commentID, userID)
	return err
}

// GetComments returns comments for a reel.
func (r *EngagementRepo) GetComments(ctx context.Context, reelID uuid.UUID, limit, offset int) ([]uuid.UUID, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id FROM reel_comments WHERE reel_id = $1 AND parent_id IS NULL
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, reelID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// ---- VIEWS ----

// RecordView inserts a view record for analytics.
func (r *EngagementRepo) RecordView(ctx context.Context, reelID uuid.UUID, userID *uuid.UUID, watchDuration int, completed bool) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO reel_views (reel_id, user_id, watch_duration, completed)
		VALUES ($1, $2, $3, $4)
	`, reelID, userID, watchDuration, completed)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `UPDATE reels SET view_count = view_count + 1 WHERE id = $1`, reelID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
