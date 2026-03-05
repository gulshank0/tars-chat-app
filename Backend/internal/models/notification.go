package models

import (
	"time"

	"github.com/google/uuid"
)

// NotificationType represents the kind of notification.
type NotificationType string

const (
	NotifTypeLike      NotificationType = "like"
	NotifTypeComment   NotificationType = "comment"
	NotifTypeFollow    NotificationType = "follow"
	NotifTypeMention   NotificationType = "mention"
	NotifTypeReelShare NotificationType = "reel_share"
)

// Notification represents an in-app notification.
type Notification struct {
	ID          uuid.UUID        `json:"id" db:"id"`
	RecipientID uuid.UUID        `json:"recipientId" db:"recipient_id"`
	ActorID     *uuid.UUID       `json:"actorId,omitempty" db:"actor_id"`
	Type        NotificationType `json:"type" db:"type"`
	EntityType  *string          `json:"entityType,omitempty" db:"entity_type"`
	EntityID    *uuid.UUID       `json:"entityId,omitempty" db:"entity_id"`
	Message     *string          `json:"message,omitempty" db:"message"`
	IsRead      bool             `json:"isRead" db:"is_read"`
	CreatedAt   time.Time        `json:"createdAt" db:"created_at"`
}

// NotificationWithActor includes the actor's profile.
type NotificationWithActor struct {
	Notification
	Actor *UserProfile `json:"actor,omitempty"`
}
