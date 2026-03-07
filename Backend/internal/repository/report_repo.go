package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

// Report represents a user content report.
type Report struct {
	ID          uuid.UUID `json:"id"`
	ReporterID  uuid.UUID `json:"reporterId"`
	EntityType  string    `json:"entityType"`
	EntityID    uuid.UUID `json:"entityId"`
	Reason      string    `json:"reason"`
	Description string    `json:"description,omitempty"`
	Status      string    `json:"status"`
}

// ReportRepo handles report database operations.
type ReportRepo struct {
	db *sql.DB
}

// NewReportRepo creates a new ReportRepo.
func NewReportRepo(db *sql.DB) *ReportRepo {
	return &ReportRepo{db: db}
}

// Create inserts a new report.
func (r *ReportRepo) Create(ctx context.Context, report *Report) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO reports (reporter_id, entity_type, entity_id, reason, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, report.ReporterID, report.EntityType, report.EntityID, report.Reason, report.Description).Scan(&report.ID)
}

// HasUserReported checks if a user has already reported a specific entity.
func (r *ReportRepo) HasUserReported(ctx context.Context, reporterID uuid.UUID, entityType string, entityID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM reports WHERE reporter_id = $1 AND entity_type = $2 AND entity_id = $3
		)
	`, reporterID, entityType, entityID).Scan(&exists)
	return exists, err
}
