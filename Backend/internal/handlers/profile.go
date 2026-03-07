package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/models"
	"github.com/gulshan/tars-social/internal/repository"
)

// ProfileHandler handles user profile endpoints.
type ProfileHandler struct {
	userRepo   *repository.UserRepo
	socialRepo *repository.SocialRepo
}

// NewProfileHandler creates a new ProfileHandler.
func NewProfileHandler(userRepo *repository.UserRepo, socialRepo *repository.SocialRepo) *ProfileHandler {
	return &ProfileHandler{userRepo: userRepo, socialRepo: socialRepo}
}

// GetMyProfile returns the current user's profile.
func (h *ProfileHandler) GetMyProfile(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	profile, err := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if profile == nil {
		jsonError(w, "profile not found", http.StatusNotFound)
		return
	}

	jsonResponse(w, profile, http.StatusOK)
}

// UpdateMyProfile updates the current user's profile.
func (h *ProfileHandler) UpdateMyProfile(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	profile, err := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if err != nil || profile == nil {
		jsonError(w, "profile not found", http.StatusNotFound)
		return
	}

	var req models.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	updated, err := h.userRepo.Update(r.Context(), profile.ID, req)
	if err != nil {
		jsonError(w, "failed to update profile", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, updated, http.StatusOK)
}

// GetUserProfile returns a user's public profile by username.
func (h *ProfileHandler) GetUserProfile(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	if username == "" {
		jsonError(w, "username required", http.StatusBadRequest)
		return
	}

	profile, err := h.userRepo.GetByUsername(r.Context(), username)
	if err != nil || profile == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	resp := models.ProfileResponse{UserProfile: *profile}

	// Check follow status if authenticated
	if clerkID, ok := middleware.GetClerkUserID(r.Context()); ok {
		currentUser, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
		if currentUser != nil && currentUser.ID != profile.ID {
			resp.IsFollowing, _ = h.socialRepo.IsFollowing(r.Context(), currentUser.ID, profile.ID)
			resp.IsFollowedBy, _ = h.socialRepo.IsFollowing(r.Context(), profile.ID, currentUser.ID)
		}
	}

	jsonResponse(w, resp, http.StatusOK)
}

// SearchUsers searches users by name or username.
func (h *ProfileHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		jsonResponse(w, []models.UserProfile{}, http.StatusOK)
		return
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}

	users, err := h.userRepo.SearchByUsername(r.Context(), query, limit)
	if err != nil {
		jsonError(w, "search failed", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, users, http.StatusOK)
}

// SyncProfile creates or updates a profile (called from webhook or on first auth).
func (h *ProfileHandler) SyncProfile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ClerkID     string  `json:"clerkId"`
		DisplayName string  `json:"displayName"`
		Email       string  `json:"email"`
		AvatarURL   *string `json:"avatarUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	profile, err := h.userRepo.Upsert(r.Context(), req.ClerkID, req.DisplayName, req.Email, req.AvatarURL)
	if err != nil {
		jsonError(w, "sync failed", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, profile, http.StatusOK)
}

// ---- helpers ----

func jsonResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}
