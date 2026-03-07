package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/repository"
)

// NotificationsHandler handles notification endpoints.
type NotificationsHandler struct {
	notifRepo *repository.NotificationRepo
	userRepo  *repository.UserRepo
}

// NewNotificationsHandler creates a new NotificationsHandler.
func NewNotificationsHandler(notifRepo *repository.NotificationRepo, userRepo *repository.UserRepo) *NotificationsHandler {
	return &NotificationsHandler{notifRepo: notifRepo, userRepo: userRepo}
}

// GetNotifications returns the current user's notifications.
func (h *NotificationsHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
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

	limit := 20
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	notifs, err := h.notifRepo.GetForUser(r.Context(), user.ID, limit, offset)
	if err != nil {
		jsonError(w, "failed to get notifications", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, notifs, http.StatusOK)
}

// MarkAsRead marks notifications as read.
func (h *NotificationsHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
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

	var req struct {
		IDs []uuid.UUID `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Mark all as read if no body
		req.IDs = nil
	}

	if err := h.notifRepo.MarkAsRead(r.Context(), user.ID, req.IDs); err != nil {
		jsonError(w, "failed to mark as read", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"status": "ok"}, http.StatusOK)
}

// UnreadCount returns the number of unread notifications.
func (h *NotificationsHandler) UnreadCount(w http.ResponseWriter, r *http.Request) {
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

	count, err := h.notifRepo.UnreadCount(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "failed to get count", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]int{"count": count}, http.StatusOK)
}
