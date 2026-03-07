package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// ReelStatus represents the processing state of a reel.
type ReelStatus string

const (
	ReelStatusProcessing ReelStatus = "processing"
	ReelStatusReady      ReelStatus = "ready"
	ReelStatusFailed     ReelStatus = "failed"
	ReelStatusRemoved    ReelStatus = "removed"
)

// Reel represents a short video.
type Reel struct {
	ID           uuid.UUID      `json:"id" db:"id"`
	CreatorID    uuid.UUID      `json:"creatorId" db:"creator_id"`
	VideoURL     string         `json:"videoUrl" db:"video_url"`
	ThumbnailURL *string        `json:"thumbnailUrl" db:"thumbnail_url"`
	Caption      string         `json:"caption" db:"caption"`
	AudioID      *uuid.UUID     `json:"audioId,omitempty" db:"audio_id"`
	DurationMs   int            `json:"durationMs" db:"duration_ms"`
	Width        *int           `json:"width,omitempty" db:"width"`
	Height       *int           `json:"height,omitempty" db:"height"`
	IsPublished  bool           `json:"isPublished" db:"is_published"`
	IsInstagram  bool           `json:"isInstagram" db:"is_instagram"`
	IGMediaID    *string        `json:"igMediaId,omitempty" db:"ig_media_id"`
	ViewCount    int64          `json:"viewCount" db:"view_count"`
	LikeCount    int64          `json:"likeCount" db:"like_count"`
	CommentCount int64          `json:"commentCount" db:"comment_count"`
	ShareCount   int64          `json:"shareCount" db:"share_count"`
	SaveCount    int64          `json:"saveCount" db:"save_count"`
	Hashtags     pq.StringArray `json:"hashtags" db:"hashtags"`
	Status       ReelStatus     `json:"status" db:"status"`
	CreatedAt    time.Time      `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time      `json:"updatedAt" db:"updated_at"`
}

// ReelFeedItem extends Reel with creator info and viewer state.
type ReelFeedItem struct {
	Reel
	Creator       UserProfile `json:"creator"`
	IsLiked       bool        `json:"isLiked"`
	IsSaved       bool        `json:"isSaved"`
	IsFollowing   bool        `json:"isFollowing"`
}

// CreateReelRequest is sent after a video has been uploaded to S3.
type CreateReelRequest struct {
	VideoURL   string   `json:"videoUrl" binding:"required"`
	Caption    string   `json:"caption"`
	DurationMs int      `json:"durationMs" binding:"required"`
	Width      int      `json:"width"`
	Height     int      `json:"height"`
	Hashtags   []string `json:"hashtags"`
}

// AudioTrack represents reusable audio for reels.
type AudioTrack struct {
	ID         uuid.UUID `json:"id" db:"id"`
	Title      string    `json:"title" db:"title"`
	Artist     *string   `json:"artist,omitempty" db:"artist"`
	AudioURL   string    `json:"audioUrl" db:"audio_url"`
	DurationMs *int      `json:"durationMs,omitempty" db:"duration_ms"`
	UseCount   int64     `json:"useCount" db:"use_count"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
}
