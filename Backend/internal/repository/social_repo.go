package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

// SocialRepo handles follow-related database operations.
type SocialRepo struct {
	db *sql.DB
}

// NewSocialRepo creates a new SocialRepo.
func NewSocialRepo(db *sql.DB) *SocialRepo {
	return &SocialRepo{db: db}
}

// Follow creates a follow relationship. Returns true if newly created.
func (r *SocialRepo) Follow(ctx context.Context, followerID, followingID uuid.UUID) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	// Insert follow (ignore conflict = already following)
	result, err := tx.ExecContext(ctx, `
		INSERT INTO follows (follower_id, following_id)
		VALUES ($1, $2) ON CONFLICT DO NOTHING
	`, followerID, followingID)
	if err != nil {
		return false, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return false, nil // already following
	}

	// Update denormalized counters
	_, err = tx.ExecContext(ctx, `UPDATE user_profiles SET following_count = following_count + 1 WHERE id = $1`, followerID)
	if err != nil {
		return false, err
	}
	_, err = tx.ExecContext(ctx, `UPDATE user_profiles SET follower_count = follower_count + 1 WHERE id = $1`, followingID)
	if err != nil {
		return false, err
	}

	return true, tx.Commit()
}

// Unfollow removes a follow relationship. Returns true if removed.
func (r *SocialRepo) Unfollow(ctx context.Context, followerID, followingID uuid.UUID) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		DELETE FROM follows WHERE follower_id = $1 AND following_id = $2
	`, followerID, followingID)
	if err != nil {
		return false, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return false, nil
	}

	_, err = tx.ExecContext(ctx, `UPDATE user_profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1`, followerID)
	if err != nil {
		return false, err
	}
	_, err = tx.ExecContext(ctx, `UPDATE user_profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = $1`, followingID)
	if err != nil {
		return false, err
	}

	return true, tx.Commit()
}

// IsFollowing checks if follower follows following.
func (r *SocialRepo) IsFollowing(ctx context.Context, followerID, followingID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2)
	`, followerID, followingID).Scan(&exists)
	return exists, err
}

// GetFollowers returns users who follow the given user.
func (r *SocialRepo) GetFollowers(ctx context.Context, userID uuid.UUID, cursor *uuid.UUID, limit int) ([]uuid.UUID, error) {
	var rows *sql.Rows
	var err error

	if cursor != nil {
		rows, err = r.db.QueryContext(ctx, `
			SELECT follower_id FROM follows
			WHERE following_id = $1 AND id < $2
			ORDER BY created_at DESC LIMIT $3
		`, userID, *cursor, limit)
	} else {
		rows, err = r.db.QueryContext(ctx, `
			SELECT follower_id FROM follows
			WHERE following_id = $1
			ORDER BY created_at DESC LIMIT $2
		`, userID, limit)
	}
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

// GetFollowing returns users the given user follows.
func (r *SocialRepo) GetFollowing(ctx context.Context, userID uuid.UUID, cursor *uuid.UUID, limit int) ([]uuid.UUID, error) {
	var rows *sql.Rows
	var err error

	if cursor != nil {
		rows, err = r.db.QueryContext(ctx, `
			SELECT following_id FROM follows
			WHERE follower_id = $1 AND id < $2
			ORDER BY created_at DESC LIMIT $3
		`, userID, *cursor, limit)
	} else {
		rows, err = r.db.QueryContext(ctx, `
			SELECT following_id FROM follows
			WHERE follower_id = $1
			ORDER BY created_at DESC LIMIT $2
		`, userID, limit)
	}
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
