package models

import (
	"time"

	"github.com/google/uuid"
)

// UserProfile represents the extended user profile stored in PostgreSQL.
type UserProfile struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	ClerkID        string     `json:"clerkId" db:"clerk_id"`
	Username       string     `json:"username" db:"username"`
	DisplayName    string     `json:"displayName" db:"display_name"`
	Bio            string     `json:"bio" db:"bio"`
	AvatarURL      *string    `json:"avatarUrl" db:"avatar_url"`
	Website        *string    `json:"website" db:"website"`
	IsVerified     bool       `json:"isVerified" db:"is_verified"`
	IsPrivate      bool       `json:"isPrivate" db:"is_private"`
	InstagramID    *string    `json:"instagramId,omitempty" db:"instagram_id"`
	IGAccessToken  *string    `json:"-" db:"ig_access_token"` // never expose
	FollowerCount  int        `json:"followerCount" db:"follower_count"`
	FollowingCount int        `json:"followingCount" db:"following_count"`
	ReelCount      int        `json:"reelCount" db:"reel_count"`
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time  `json:"updatedAt" db:"updated_at"`
}

// Follow represents a follow relationship.
type Follow struct {
	ID          uuid.UUID `json:"id" db:"id"`
	FollowerID  uuid.UUID `json:"followerId" db:"follower_id"`
	FollowingID uuid.UUID `json:"followingId" db:"following_id"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
}

// ProfileResponse is the public-facing profile data.
type ProfileResponse struct {
	UserProfile
	IsFollowing  bool `json:"isFollowing"`
	IsFollowedBy bool `json:"isFollowedBy"`
}

// UpdateProfileRequest contains the fields a user can update.
type UpdateProfileRequest struct {
	DisplayName *string `json:"displayName"`
	Username    *string `json:"username"`
	Bio         *string `json:"bio"`
	Website     *string `json:"website"`
	IsPrivate   *bool   `json:"isPrivate"`
}
