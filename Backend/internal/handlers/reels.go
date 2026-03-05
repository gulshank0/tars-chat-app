package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/models"
	"github.com/gulshan/tars-social/internal/repository"
	"github.com/gulshan/tars-social/pkg/storage"
)

// ReelsHandler handles reel endpoints.
type ReelsHandler struct {
	reelRepo       *repository.ReelRepo
	userRepo       *repository.UserRepo
	engagementRepo *repository.EngagementRepo
	s3Client       *storage.S3Client
}

// NewReelsHandler creates a new ReelsHandler.
func NewReelsHandler(
	reelRepo *repository.ReelRepo,
	userRepo *repository.UserRepo,
	engagementRepo *repository.EngagementRepo,
	s3Client *storage.S3Client,
) *ReelsHandler {
	return &ReelsHandler{
		reelRepo:       reelRepo,
		userRepo:       userRepo,
		engagementRepo: engagementRepo,
		s3Client:       s3Client,
	}
}

// GetUploadURL generates a presigned S3 URL for direct video upload.
func (h *ReelsHandler) GetUploadURL(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if user == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	reelID := uuid.New().String()
	key := storage.MediaKey(user.ID.String(), reelID, "original.mp4")

	uploadURL, err := h.s3Client.GenerateUploadURL(r.Context(), key, "video/mp4")
	if err != nil {
		jsonError(w, "failed to generate upload URL", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{
		"uploadUrl": uploadURL,
		"reelId":    reelID,
		"key":       key,
	}, http.StatusOK)
}

// CreateReel creates a reel record after the video has been uploaded to S3.
func (h *ReelsHandler) CreateReel(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if user == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	var req models.CreateReelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	reel := &models.Reel{
		CreatorID:  user.ID,
		VideoURL:   req.VideoURL,
		Caption:    req.Caption,
		DurationMs: req.DurationMs,
		Status:     models.ReelStatusProcessing,
		Hashtags:   req.Hashtags,
	}
	if req.Width > 0 {
		reel.Width = &req.Width
	}
	if req.Height > 0 {
		reel.Height = &req.Height
	}

	if err := h.reelRepo.Create(r.Context(), reel); err != nil {
		jsonError(w, "failed to create reel", http.StatusInternalServerError)
		return
	}

	// TODO: Enqueue video processing job (transcoding + thumbnail generation)
	// For now, mark as ready immediately
	_ = h.reelRepo.UpdateStatus(r.Context(), reel.ID, models.ReelStatusReady, nil)

	jsonResponse(w, reel, http.StatusCreated)
}

// GetReel returns a single reel with creator info and viewer state.
func (h *ReelsHandler) GetReel(w http.ResponseWriter, r *http.Request) {
	reelID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid reel ID", http.StatusBadRequest)
		return
	}

	reel, err := h.reelRepo.GetByID(r.Context(), reelID)
	if err != nil || reel == nil {
		jsonError(w, "reel not found", http.StatusNotFound)
		return
	}

	creator, _ := h.userRepo.GetByID(r.Context(), reel.CreatorID)
	if creator == nil {
		jsonError(w, "creator not found", http.StatusNotFound)
		return
	}

	feedItem := models.ReelFeedItem{
		Reel:    *reel,
		Creator: *creator,
	}

	// Check viewer state if authenticated
	if clerkID, ok := middleware.GetClerkUserID(r.Context()); ok {
		currentUser, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
		if currentUser != nil {
			feedItem.IsLiked, _ = h.engagementRepo.IsLiked(r.Context(), reelID, currentUser.ID)
			feedItem.IsSaved, _ = h.engagementRepo.IsSaved(r.Context(), reelID, currentUser.ID)
		}
	}

	jsonResponse(w, feedItem, http.StatusOK)
}

// DeleteReel deletes a reel owned by the current user.
func (h *ReelsHandler) DeleteReel(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	reelID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid reel ID", http.StatusBadRequest)
		return
	}

	user, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if user == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	if err := h.reelRepo.Delete(r.Context(), reelID, user.ID); err != nil {
		jsonError(w, "failed to delete reel", http.StatusInternalServerError)
		return
	}

	// Clean up S3 objects
	key := storage.MediaKey(user.ID.String(), reelID.String(), "original.mp4")
	_ = h.s3Client.DeleteObject(r.Context(), key)

	jsonResponse(w, map[string]string{"status": "deleted"}, http.StatusOK)
}

// GetFeed returns the personalized reels feed.
func (h *ReelsHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if user == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	cursor := r.URL.Query().Get("cursor")
	var cursorPtr *string
	if cursor != "" {
		cursorPtr = &cursor
	}

	reels, err := h.reelRepo.GetFeed(r.Context(), user.ID, cursorPtr, 10)
	if err != nil {
		jsonError(w, "failed to load feed", http.StatusInternalServerError)
		return
	}

	// Enrich with creator info and viewer state
	feedItems := make([]models.ReelFeedItem, 0, len(reels))
	for _, reel := range reels {
		creator, _ := h.userRepo.GetByID(r.Context(), reel.CreatorID)
		if creator == nil {
			continue
		}

		item := models.ReelFeedItem{
			Reel:    reel,
			Creator: *creator,
		}
		item.IsLiked, _ = h.engagementRepo.IsLiked(r.Context(), reel.ID, user.ID)
		item.IsSaved, _ = h.engagementRepo.IsSaved(r.Context(), reel.ID, user.ID)

		feedItems = append(feedItems, item)
	}

	// Build cursor for next page
	var nextCursor string
	if len(reels) > 0 {
		nextCursor = reels[len(reels)-1].ID.String()
	}

	jsonResponse(w, map[string]interface{}{
		"reels":      feedItems,
		"nextCursor": nextCursor,
		"hasMore":    len(reels) == 10,
	}, http.StatusOK)
}

// GetTrending returns trending reels.
func (h *ReelsHandler) GetTrending(w http.ResponseWriter, r *http.Request) {
	reels, err := h.reelRepo.GetTrending(r.Context(), 20)
	if err != nil {
		jsonError(w, "failed to load trending", http.StatusInternalServerError)
		return
	}

	feedItems := make([]models.ReelFeedItem, 0, len(reels))
	for _, reel := range reels {
		creator, _ := h.userRepo.GetByID(r.Context(), reel.CreatorID)
		if creator == nil {
			continue
		}
		feedItems = append(feedItems, models.ReelFeedItem{
			Reel:    reel,
			Creator: *creator,
		})
	}

	jsonResponse(w, feedItems, http.StatusOK)
}

// GetUserReels returns reels created by a specific user.
func (h *ReelsHandler) GetUserReels(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	cursor := r.URL.Query().Get("cursor")
	var cursorPtr *string
	if cursor != "" {
		cursorPtr = &cursor
	}

	reels, err := h.reelRepo.GetByCreator(r.Context(), userID, cursorPtr, 20)
	if err != nil {
		jsonError(w, "failed to load reels", http.StatusInternalServerError)
		return
	}

	_ = fmt.Sprint(len(reels))
	jsonResponse(w, reels, http.StatusOK)
}
