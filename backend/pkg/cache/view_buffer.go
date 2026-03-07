package cache

import (
	"context"
	"database/sql"
	"log"
	"strconv"
	"time"

	"github.com/google/uuid"
)

const viewBufferKey = "view_buffer"

// ViewBuffer accumulates view counts in Redis and flushes them to PostgreSQL periodically.
type ViewBuffer struct {
	rdb      *RedisClient
	db       *sql.DB
	interval time.Duration
	stopCh   chan struct{}
}

// NewViewBuffer creates a new ViewBuffer.
func NewViewBuffer(rdb *RedisClient, db *sql.DB, flushInterval time.Duration) *ViewBuffer {
	return &ViewBuffer{
		rdb:      rdb,
		db:       db,
		interval: flushInterval,
		stopCh:   make(chan struct{}),
	}
}

// BufferView increments the view count for a reel in Redis.
func (vb *ViewBuffer) BufferView(ctx context.Context, reelID uuid.UUID) error {
	_, err := vb.rdb.HIncrBy(ctx, viewBufferKey, reelID.String(), 1)
	return err
}

// Start begins the periodic flush goroutine.
func (vb *ViewBuffer) Start() {
	go func() {
		ticker := time.NewTicker(vb.interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				vb.flush()
			case <-vb.stopCh:
				// Final flush before stopping
				vb.flush()
				return
			}
		}
	}()
	log.Printf("📊 View buffer started (flush every %s)", vb.interval)
}

// Stop signals the flush goroutine to stop.
func (vb *ViewBuffer) Stop() {
	close(vb.stopCh)
}

// flush reads all buffered view counts from Redis and applies them to PostgreSQL.
func (vb *ViewBuffer) flush() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	entries, err := vb.rdb.HGetAll(ctx, viewBufferKey)
	if err != nil {
		log.Printf("⚠️  View buffer flush: failed to read redis: %v", err)
		return
	}

	if len(entries) == 0 {
		return
	}

	flushed := 0
	for reelIDStr, countStr := range entries {
		reelID, err := uuid.Parse(reelIDStr)
		if err != nil {
			// Bad key — remove it
			vb.rdb.HDel(ctx, viewBufferKey, reelIDStr)
			continue
		}

		count, err := strconv.ParseInt(countStr, 10, 64)
		if err != nil || count <= 0 {
			vb.rdb.HDel(ctx, viewBufferKey, reelIDStr)
			continue
		}

		// Atomically update PostgreSQL
		_, err = vb.db.ExecContext(ctx,
			`UPDATE reels SET view_count = view_count + $1 WHERE id = $2`,
			count, reelID,
		)
		if err != nil {
			log.Printf("⚠️  View buffer flush: failed to update reel %s: %v", reelIDStr, err)
			continue
		}

		// Remove the flushed entry from Redis
		vb.rdb.HDel(ctx, viewBufferKey, reelIDStr)
		flushed++
	}

	if flushed > 0 {
		log.Printf("📊 View buffer flushed %d reels", flushed)
	}
}
