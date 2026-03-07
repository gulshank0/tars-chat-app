package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient wraps go-redis with convenience helpers for caching.
type RedisClient struct {
	client *redis.Client
}

// NewRedisClient connects to Redis using the given URL (e.g. "redis://localhost:6379/0").
func NewRedisClient(redisURL string) (*RedisClient, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis URL: %w", err)
	}
	opt.PoolSize = 20
	opt.MinIdleConns = 5
	opt.DialTimeout = 3 * time.Second
	opt.ReadTimeout = 2 * time.Second
	opt.WriteTimeout = 2 * time.Second

	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return &RedisClient{client: client}, nil
}

// Ping checks Redis connectivity.
func (r *RedisClient) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Close gracefully closes the Redis connection pool.
func (r *RedisClient) Close() error {
	return r.client.Close()
}

// ---- JSON Get/Set Helpers ----

// GetJSON retrieves a cached JSON value. Returns false if key is missing.
func (r *RedisClient) GetJSON(ctx context.Context, key string, dest interface{}) (bool, error) {
	val, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal([]byte(val), dest); err != nil {
		// Corrupted cache entry — delete and return miss
		r.client.Del(ctx, key)
		return false, nil
	}
	return true, nil
}

// SetJSON stores a value as JSON with the given TTL.
func (r *RedisClient) SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, data, ttl).Err()
}

// Del removes one or more cache keys.
func (r *RedisClient) Del(ctx context.Context, keys ...string) error {
	return r.client.Del(ctx, keys...).Err()
}

// ---- Rate Limiting ----

// RateLimitCheck implements a sliding-window rate limiter using INCR + EXPIRE.
// Returns true if the request is allowed.
func (r *RedisClient) RateLimitCheck(ctx context.Context, key string, max int, window time.Duration) (bool, error) {
	pipe := r.client.Pipeline()
	incrCmd := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, window)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, err
	}

	count := incrCmd.Val()
	return count <= int64(max), nil
}

// ---- Counter Helpers ----

// Incr atomically increments a Redis key and returns the new value.
func (r *RedisClient) Incr(ctx context.Context, key string) (int64, error) {
	return r.client.Incr(ctx, key).Result()
}

// HIncrBy increments a field inside a Redis hash.
func (r *RedisClient) HIncrBy(ctx context.Context, key, field string, incr int64) (int64, error) {
	return r.client.HIncrBy(ctx, key, field, incr).Result()
}

// HGetAll returns all fields and values in a hash.
func (r *RedisClient) HGetAll(ctx context.Context, key string) (map[string]string, error) {
	return r.client.HGetAll(ctx, key).Result()
}

// HDel removes fields from a hash.
func (r *RedisClient) HDel(ctx context.Context, key string, fields ...string) error {
	return r.client.HDel(ctx, key, fields...).Err()
}

// ---- Sorted Set (Leaderboard) Helpers ----

// ZIncrBy increments a member's score in a sorted set.
func (r *RedisClient) ZIncrBy(ctx context.Context, key string, increment float64, member string) error {
	return r.client.ZIncrBy(ctx, key, increment, member).Err()
}

// ZRevRangeWithScores returns top N members from a sorted set (highest first).
func (r *RedisClient) ZRevRangeWithScores(ctx context.Context, key string, start, stop int64) ([]redis.Z, error) {
	return r.client.ZRevRangeWithScores(ctx, key, start, stop).Result()
}

// SetExpire sets a TTL on an existing key.
func (r *RedisClient) SetExpire(ctx context.Context, key string, ttl time.Duration) error {
	return r.client.Expire(ctx, key, ttl).Err()
}

// ---- Pub/Sub (for cache invalidation across instances) ----

// Publish sends a message on a Redis pub/sub channel.
func (r *RedisClient) Publish(ctx context.Context, channel, message string) error {
	return r.client.Publish(ctx, channel, message).Err()
}

// Client returns the underlying go-redis client for advanced usage.
func (r *RedisClient) Client() *redis.Client {
	return r.client
}

// LogCacheHit logs a cache hit for debugging (disable in production).
func LogCacheHit(key string) {
	log.Printf("🟢 CACHE HIT: %s", key)
}

// LogCacheMiss logs a cache miss for debugging.
func LogCacheMiss(key string) {
	log.Printf("🔴 CACHE MISS: %s", key)
}
