package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/models"
)

// NotificationRepo handles notification database operations.
type NotificationRepo struct {
	db *sql.DB
}

// NewNotificationRepo creates a new NotificationRepo.
func NewNotificationRepo(db *sql.DB) *NotificationRepo {
	return &NotificationRepo{db: db}
}

// Create inserts a new notification.
func (r *NotificationRepo) Create(ctx context.Context, n *models.Notification) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, message)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`, n.RecipientID, n.ActorID, n.Type, n.EntityType, n.EntityID, n.Message,
	).Scan(&n.ID, &n.CreatedAt)
}

// GetForUser returns notifications for a user, most recent first.
func (r *NotificationRepo) GetForUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.NotificationWithActor, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT n.id, n.recipient_id, n.actor_id, n.type, n.entity_type, n.entity_id,
		       n.message, n.is_read, n.created_at,
		       u.id, u.clerk_id, u.username, u.display_name, u.avatar_url
		FROM notifications n
		LEFT JOIN user_profiles u ON u.id = n.actor_id
		WHERE n.recipient_id = $1
		ORDER BY n.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []models.NotificationWithActor
	for rows.Next() {
		var n models.NotificationWithActor
		var actor models.UserProfile
		var actorID *uuid.UUID
		var actorClerkID, actorUsername, actorDisplayName *string
		var actorAvatar *string

		if err := rows.Scan(
			&n.ID, &n.RecipientID, &n.ActorID, &n.Type, &n.EntityType, &n.EntityID,
			&n.Message, &n.IsRead, &n.CreatedAt,
			&actorID, &actorClerkID, &actorUsername, &actorDisplayName, &actorAvatar,
		); err != nil {
			return nil, err
		}

		if actorID != nil {
			actor.ID = *actorID
			if actorClerkID != nil {
				actor.ClerkID = *actorClerkID
			}
			if actorUsername != nil {
				actor.Username = *actorUsername
			}
			if actorDisplayName != nil {
				actor.DisplayName = *actorDisplayName
			}
			actor.AvatarURL = actorAvatar
			n.Actor = &actor
		}

		notifs = append(notifs, n)
	}
	return notifs, rows.Err()
}

// MarkAsRead marks specified notification IDs as read.
func (r *NotificationRepo) MarkAsRead(ctx context.Context, userID uuid.UUID, ids []uuid.UUID) error {
	if len(ids) == 0 {
		// Mark all as read
		_, err := r.db.ExecContext(ctx, `UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1`, userID)
		return err
	}
	// Mark specific IDs
	for _, id := range ids {
		_, _ = r.db.ExecContext(ctx, `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2`, id, userID)
	}
	return nil
}

// UnreadCount returns the count of unread notifications for a user.
func (r *NotificationRepo) UnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`, userID).Scan(&count)
	return count, err
}
