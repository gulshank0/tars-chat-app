package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/models"
	"github.com/gulshan/tars-social/internal/repository"
)

// EngagementHandler handles like, comment, save, and view endpoints.
type EngagementHandler struct {
	engagementRepo *repository.EngagementRepo
	userRepo       *repository.UserRepo
	reelRepo       *repository.ReelRepo
	notifRepo      *repository.NotificationRepo
}

// NewEngagementHandler creates a new EngagementHandler.
func NewEngagementHandler(
	engagementRepo *repository.EngagementRepo,
	userRepo *repository.UserRepo,
	reelRepo *repository.ReelRepo,
	notifRepo *repository.NotificationRepo,
) *EngagementHandler {
	return &EngagementHandler{
		engagementRepo: engagementRepo,
		userRepo:       userRepo,
		reelRepo:       reelRepo,
		notifRepo:      notifRepo,
	}
}

// LikeReel likes a reel.
func (h *EngagementHandler) LikeReel(w http.ResponseWriter, r *http.Request) {
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

	created, err := h.engagementRepo.LikeReel(r.Context(), reelID, user.ID)
	if err != nil {
		jsonError(w, "failed to like", http.StatusInternalServerError)
		return
	}

	// Send notification to reel creator (async)
	if created {
		go func() {
			reel, _ := h.reelRepo.GetByID(r.Context(), reelID)
			if reel != nil && reel.CreatorID != user.ID {
				entityType := "reel"
				n := &models.Notification{
					RecipientID: reel.CreatorID,
					ActorID:     &user.ID,
					Type:        models.NotifTypeLike,
					EntityType:  &entityType,
					EntityID:    &reelID,
				}
				_ = h.notifRepo.Create(r.Context(), n)
			}
		}()
	}

	jsonResponse(w, map[string]bool{"liked": true}, http.StatusOK)
}

// UnlikeReel unlikes a reel.
func (h *EngagementHandler) UnlikeReel(w http.ResponseWriter, r *http.Request) {
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

	_, err = h.engagementRepo.UnlikeReel(r.Context(), reelID, user.ID)
	if err != nil {
		jsonError(w, "failed to unlike", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"liked": false}, http.StatusOK)
}

// AddComment adds a comment to a reel.
func (h *EngagementHandler) AddComment(w http.ResponseWriter, r *http.Request) {
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

	var req models.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		jsonError(w, "comment content required", http.StatusBadRequest)
		return
	}

	commentID, err := h.engagementRepo.AddComment(r.Context(), reelID, user.ID, req.Content, req.ParentID)
	if err != nil {
		jsonError(w, "failed to add comment", http.StatusInternalServerError)
		return
	}

	// Send notification to reel creator (async)
	go func() {
		reel, _ := h.reelRepo.GetByID(r.Context(), reelID)
		if reel != nil && reel.CreatorID != user.ID {
			entityType := "reel"
			n := &models.Notification{
				RecipientID: reel.CreatorID,
				ActorID:     &user.ID,
				Type:        models.NotifTypeComment,
				EntityType:  &entityType,
				EntityID:    &reelID,
			}
			_ = h.notifRepo.Create(r.Context(), n)
		}
	}()

	jsonResponse(w, map[string]string{"commentId": commentID.String()}, http.StatusCreated)
}

// DeleteComment deletes a comment owned by the current user.
func (h *EngagementHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	commentID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid comment ID", http.StatusBadRequest)
		return
	}

	user, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if user == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	if err := h.engagementRepo.DeleteComment(r.Context(), commentID, user.ID); err != nil {
		jsonError(w, "failed to delete comment", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"status": "deleted"}, http.StatusOK)
}

// SaveReel bookmarks a reel.
func (h *EngagementHandler) SaveReel(w http.ResponseWriter, r *http.Request) {
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

	_, err = h.engagementRepo.SaveReel(r.Context(), reelID, user.ID)
	if err != nil {
		jsonError(w, "failed to save", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"saved": true}, http.StatusOK)
}

// UnsaveReel removes a bookmark.
func (h *EngagementHandler) UnsaveReel(w http.ResponseWriter, r *http.Request) {
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

	_, err = h.engagementRepo.UnsaveReel(r.Context(), reelID, user.ID)
	if err != nil {
		jsonError(w, "failed to unsave", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"saved": false}, http.StatusOK)
}

// RecordView records a reel view for analytics.
func (h *EngagementHandler) RecordView(w http.ResponseWriter, r *http.Request) {
	reelID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid reel ID", http.StatusBadRequest)
		return
	}

	var req models.RecordViewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// User ID is optional (anonymous views are tracked too)
	var userIDPtr *interface{}
	if clerkID, ok := middleware.GetClerkUserID(r.Context()); ok {
		user, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
		if user != nil {
			var uid interface{} = user.ID
			userIDPtr = &uid
		}
	}

	_ = userIDPtr // simplified - pass to repo
	if err := h.engagementRepo.RecordView(r.Context(), reelID, nil, req.WatchDuration, req.Completed); err != nil {
		jsonError(w, "failed to record view", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"status": "recorded"}, http.StatusOK)
}
