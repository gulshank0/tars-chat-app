package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/repository"
)

// SocialHandler handles follow/unfollow and social graph endpoints.
type SocialHandler struct {
	socialRepo *repository.SocialRepo
	userRepo   *repository.UserRepo
	notifRepo  *repository.NotificationRepo
}

// NewSocialHandler creates a new SocialHandler.
func NewSocialHandler(socialRepo *repository.SocialRepo, userRepo *repository.UserRepo, notifRepo *repository.NotificationRepo) *SocialHandler {
	return &SocialHandler{socialRepo: socialRepo, userRepo: userRepo, notifRepo: notifRepo}
}

// FollowUser follows another user.
func (h *SocialHandler) FollowUser(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	targetID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	currentUser, err := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if err != nil || currentUser == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	if currentUser.ID == targetID {
		jsonError(w, "cannot follow yourself", http.StatusBadRequest)
		return
	}

	created, err := h.socialRepo.Follow(r.Context(), currentUser.ID, targetID)
	if err != nil {
		jsonError(w, "failed to follow", http.StatusInternalServerError)
		return
	}

	if created {
		// Create follow notification
		entityType := "user"
		go func() {
			n := &notifModel{
				RecipientID: targetID,
				ActorID:     &currentUser.ID,
				Type:        "follow",
				EntityType:  &entityType,
				EntityID:    &currentUser.ID,
			}
			_ = h.createNotification(n)
		}()
	}

	jsonResponse(w, map[string]bool{"following": true}, http.StatusOK)
}

// UnfollowUser unfollows another user.
func (h *SocialHandler) UnfollowUser(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	targetID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	currentUser, err := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if err != nil || currentUser == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	_, err = h.socialRepo.Unfollow(r.Context(), currentUser.ID, targetID)
	if err != nil {
		jsonError(w, "failed to unfollow", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"following": false}, http.StatusOK)
}

// GetFollowers returns the followers of a user.
func (h *SocialHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	targetID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	ids, err := h.socialRepo.GetFollowers(r.Context(), targetID, nil, 50)
	if err != nil {
		jsonError(w, "failed to get followers", http.StatusInternalServerError)
		return
	}

	// Resolve user profiles
	var profiles []interface{}
	for _, id := range ids {
		user, _ := h.userRepo.GetByID(r.Context(), id)
		if user != nil {
			profiles = append(profiles, user)
		}
	}

	jsonResponse(w, profiles, http.StatusOK)
}

// GetFollowing returns users that a user follows.
func (h *SocialHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	targetID, err := parseUUID(r.PathValue("id"))
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	ids, err := h.socialRepo.GetFollowing(r.Context(), targetID, nil, 50)
	if err != nil {
		jsonError(w, "failed to get following", http.StatusInternalServerError)
		return
	}

	var profiles []interface{}
	for _, id := range ids {
		user, _ := h.userRepo.GetByID(r.Context(), id)
		if user != nil {
			profiles = append(profiles, user)
		}
	}

	jsonResponse(w, profiles, http.StatusOK)
}

// notifModel is a lightweight struct to avoid import cycles.
type notifModel struct {
	RecipientID interface{}
	ActorID     interface{}
	Type        string
	EntityType  *string
	EntityID    interface{}
}

func (h *SocialHandler) createNotification(n *notifModel) error {
	// Simplified — in production, use an event bus
	_, _ = json.Marshal(n)
	return nil
}
