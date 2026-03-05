package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/models"
)

// UserRepo handles user_profiles database operations.
type UserRepo struct {
	db *sql.DB
}

// NewUserRepo creates a new UserRepo.
func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

// GetByClerkID finds a user profile by their Clerk ID.
func (r *UserRepo) GetByClerkID(ctx context.Context, clerkID string) (*models.UserProfile, error) {
	var u models.UserProfile
	err := r.db.QueryRowContext(ctx, `
		SELECT id, clerk_id, username, display_name, bio, avatar_url, website,
		       is_verified, is_private, instagram_id, follower_count, following_count,
		       reel_count, created_at, updated_at
		FROM user_profiles WHERE clerk_id = $1
	`, clerkID).Scan(
		&u.ID, &u.ClerkID, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarURL,
		&u.Website, &u.IsVerified, &u.IsPrivate, &u.InstagramID,
		&u.FollowerCount, &u.FollowingCount, &u.ReelCount, &u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

// GetByID finds a user profile by UUID.
func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.UserProfile, error) {
	var u models.UserProfile
	err := r.db.QueryRowContext(ctx, `
		SELECT id, clerk_id, username, display_name, bio, avatar_url, website,
		       is_verified, is_private, instagram_id, follower_count, following_count,
		       reel_count, created_at, updated_at
		FROM user_profiles WHERE id = $1
	`, id).Scan(
		&u.ID, &u.ClerkID, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarURL,
		&u.Website, &u.IsVerified, &u.IsPrivate, &u.InstagramID,
		&u.FollowerCount, &u.FollowingCount, &u.ReelCount, &u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

// GetByUsername finds a user profile by username.
func (r *UserRepo) GetByUsername(ctx context.Context, username string) (*models.UserProfile, error) {
	var u models.UserProfile
	err := r.db.QueryRowContext(ctx, `
		SELECT id, clerk_id, username, display_name, bio, avatar_url, website,
		       is_verified, is_private, instagram_id, follower_count, following_count,
		       reel_count, created_at, updated_at
		FROM user_profiles WHERE username = $1
	`, username).Scan(
		&u.ID, &u.ClerkID, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarURL,
		&u.Website, &u.IsVerified, &u.IsPrivate, &u.InstagramID,
		&u.FollowerCount, &u.FollowingCount, &u.ReelCount, &u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

// Upsert creates or updates a user profile from Clerk data.
func (r *UserRepo) Upsert(ctx context.Context, clerkID, displayName, email string, avatarURL *string) (*models.UserProfile, error) {
	// Generate username from email prefix, append random suffix if conflict
	username := strings.Split(email, "@")[0]
	username = strings.ReplaceAll(username, ".", "_")
	if len(username) > 40 {
		username = username[:40]
	}

	var u models.UserProfile
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO user_profiles (clerk_id, username, display_name, avatar_url)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (clerk_id)
		DO UPDATE SET display_name = EXCLUDED.display_name,
		              avatar_url = EXCLUDED.avatar_url,
		              updated_at = NOW()
		RETURNING id, clerk_id, username, display_name, bio, avatar_url, website,
		          is_verified, is_private, instagram_id, follower_count, following_count,
		          reel_count, created_at, updated_at
	`, clerkID, username, displayName, avatarURL).Scan(
		&u.ID, &u.ClerkID, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarURL,
		&u.Website, &u.IsVerified, &u.IsPrivate, &u.InstagramID,
		&u.FollowerCount, &u.FollowingCount, &u.ReelCount, &u.CreatedAt, &u.UpdatedAt,
	)
	return &u, err
}

// Update updates a user's profile fields.
func (r *UserRepo) Update(ctx context.Context, id uuid.UUID, req models.UpdateProfileRequest) (*models.UserProfile, error) {
	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	if req.DisplayName != nil {
		setClauses = append(setClauses, fmt.Sprintf("display_name = $%d", argIdx))
		args = append(args, *req.DisplayName)
		argIdx++
	}
	if req.Username != nil {
		setClauses = append(setClauses, fmt.Sprintf("username = $%d", argIdx))
		args = append(args, *req.Username)
		argIdx++
	}
	if req.Bio != nil {
		setClauses = append(setClauses, fmt.Sprintf("bio = $%d", argIdx))
		args = append(args, *req.Bio)
		argIdx++
	}
	if req.Website != nil {
		setClauses = append(setClauses, fmt.Sprintf("website = $%d", argIdx))
		args = append(args, *req.Website)
		argIdx++
	}
	if req.IsPrivate != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_private = $%d", argIdx))
		args = append(args, *req.IsPrivate)
		argIdx++
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id)
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE user_profiles SET %s WHERE id = $%d
		RETURNING id, clerk_id, username, display_name, bio, avatar_url, website,
		          is_verified, is_private, instagram_id, follower_count, following_count,
		          reel_count, created_at, updated_at
	`, strings.Join(setClauses, ", "), argIdx)

	var u models.UserProfile
	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&u.ID, &u.ClerkID, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarURL,
		&u.Website, &u.IsVerified, &u.IsPrivate, &u.InstagramID,
		&u.FollowerCount, &u.FollowingCount, &u.ReelCount, &u.CreatedAt, &u.UpdatedAt,
	)
	return &u, err
}

// SearchByUsername searches users by username prefix.
func (r *UserRepo) SearchByUsername(ctx context.Context, query string, limit int) ([]models.UserProfile, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, clerk_id, username, display_name, bio, avatar_url, website,
		       is_verified, is_private, instagram_id, follower_count, following_count,
		       reel_count, created_at, updated_at
		FROM user_profiles
		WHERE username ILIKE $1 OR display_name ILIKE $1
		ORDER BY follower_count DESC
		LIMIT $2
	`, query+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.UserProfile
	for rows.Next() {
		var u models.UserProfile
		if err := rows.Scan(
			&u.ID, &u.ClerkID, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarURL,
			&u.Website, &u.IsVerified, &u.IsPrivate, &u.InstagramID,
			&u.FollowerCount, &u.FollowingCount, &u.ReelCount, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}
