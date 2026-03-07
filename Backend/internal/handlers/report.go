package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/repository"
)

// ReportHandler handles content reporting endpoints.
type ReportHandler struct {
	reportRepo *repository.ReportRepo
	userRepo   *repository.UserRepo
}

// NewReportHandler creates a new ReportHandler.
func NewReportHandler(reportRepo *repository.ReportRepo, userRepo *repository.UserRepo) *ReportHandler {
	return &ReportHandler{reportRepo: reportRepo, userRepo: userRepo}
}

// validReasons lists the accepted report reasons.
var validReasons = map[string]bool{
	"spam":        true,
	"nudity":      true,
	"harassment":  true,
	"false_info":  true,
	"violence":    true,
	"hate_speech": true,
	"other":       true,
}

// CreateReport handles submission of a content report.
func (h *ReportHandler) CreateReport(w http.ResponseWriter, r *http.Request) {
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
		EntityType  string `json:"entityType"`
		EntityID    string `json:"entityId"`
		Reason      string `json:"reason"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate entity type
	if req.EntityType != "reel" && req.EntityType != "user" && req.EntityType != "comment" {
		jsonError(w, "invalid entity type — must be reel, user, or comment", http.StatusBadRequest)
		return
	}

	// Validate reason
	if !validReasons[req.Reason] {
		jsonError(w, "invalid report reason", http.StatusBadRequest)
		return
	}

	entityID, err := uuid.Parse(req.EntityID)
	if err != nil {
		jsonError(w, "invalid entity ID", http.StatusBadRequest)
		return
	}

	// Check for duplicate report
	already, _ := h.reportRepo.HasUserReported(r.Context(), user.ID, req.EntityType, entityID)
	if already {
		jsonError(w, "you have already reported this content", http.StatusConflict)
		return
	}

	report := &repository.Report{
		ReporterID:  user.ID,
		EntityType:  req.EntityType,
		EntityID:    entityID,
		Reason:      req.Reason,
		Description: req.Description,
	}

	if err := h.reportRepo.Create(r.Context(), report); err != nil {
		jsonError(w, "failed to submit report", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"reported": true,
		"reportId": report.ID,
	}, http.StatusCreated)
}
