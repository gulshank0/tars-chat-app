package middleware

import (
	"net/http"
	"sync"
	"time"
)

// RateLimitConfig defines the rate limit for a bucket.
type RateLimitConfig struct {
	Window time.Duration
	Max    int
}

// RateLimiter is an in-memory token-bucket rate limiter per user.
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	config  RateLimitConfig
}

type bucket struct {
	tokens    int
	lastReset time.Time
}

// DefaultLimits defines rate limits for different operations.
var DefaultLimits = map[string]RateLimitConfig{
	"global":  {Window: 1 * time.Minute, Max: 300},
	"upload":  {Window: 1 * time.Hour, Max: 10},
	"like":    {Window: 1 * time.Minute, Max: 60},
	"comment": {Window: 1 * time.Minute, Max: 30},
	"follow":  {Window: 1 * time.Hour, Max: 100},
}

// NewRateLimiter creates a rate limiter with the given config.
func NewRateLimiter(cfg RateLimitConfig) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*bucket),
		config:  cfg,
	}
	// Cleanup stale buckets every 5 minutes
	go rl.cleanup()
	return rl
}

// Allow checks if the given key (e.g., user ID) is within the rate limit.
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	b, ok := rl.buckets[key]
	if !ok || time.Since(b.lastReset) >= rl.config.Window {
		rl.buckets[key] = &bucket{tokens: rl.config.Max - 1, lastReset: time.Now()}
		return true
	}

	if b.tokens <= 0 {
		return false
	}

	b.tokens--
	return true
}

// Middleware returns an HTTP middleware that rate-limits by Clerk user ID.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := "anon"
		if userID, ok := GetClerkUserID(r.Context()); ok {
			key = userID
		}

		if !rl.Allow(key) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"rate limit exceeded"}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}

// cleanup removes stale buckets periodically.
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		for key, b := range rl.buckets {
			if time.Since(b.lastReset) > rl.config.Window*2 {
				delete(rl.buckets, key)
			}
		}
		rl.mu.Unlock()
	}
}
