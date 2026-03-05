package models

import (
	"time"

	"github.com/google/uuid"
)

// ReelLike represents a user liking a reel.
type ReelLike struct {
	ID        uuid.UUID `json:"id" db:"id"`
	ReelID    uuid.UUID `json:"reelId" db:"reel_id"`
	UserID    uuid.UUID `json:"userId" db:"user_id"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// ReelComment represents a comment on a reel.
type ReelComment struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	ReelID    uuid.UUID  `json:"reelId" db:"reel_id"`
	UserID    uuid.UUID  `json:"userId" db:"user_id"`
	ParentID  *uuid.UUID `json:"parentId,omitempty" db:"parent_id"`
	Content   string     `json:"content" db:"content"`
	LikeCount int        `json:"likeCount" db:"like_count"`
	IsDeleted bool       `json:"isDeleted" db:"is_deleted"`
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`
}

// CommentWithUser includes user info for display.
type CommentWithUser struct {
	ReelComment
	User UserProfile `json:"user"`
}

// CreateCommentRequest is the request body for creating a comment.
type CreateCommentRequest struct {
	Content  string     `json:"content" binding:"required,min=1,max=2000"`
	ParentID *uuid.UUID `json:"parentId,omitempty"`
}

// ReelSave represents a user bookmarking a reel.
type ReelSave struct {
	ID        uuid.UUID `json:"id" db:"id"`
	ReelID    uuid.UUID `json:"reelId" db:"reel_id"`
	UserID    uuid.UUID `json:"userId" db:"user_id"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// ReelView represents a view on a reel (for analytics / recommendations).
type ReelView struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	ReelID        uuid.UUID  `json:"reelId" db:"reel_id"`
	UserID        *uuid.UUID `json:"userId,omitempty" db:"user_id"`
	WatchDuration int        `json:"watchDuration" db:"watch_duration"`
	Completed     bool       `json:"completed" db:"completed"`
	CreatedAt     time.Time  `json:"createdAt" db:"created_at"`
}

// RecordViewRequest is sent when a user watches a reel.
type RecordViewRequest struct {
	WatchDuration int  `json:"watchDuration"`
	Completed     bool `json:"completed"`
}
