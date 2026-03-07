package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	// Server
	Port        string
	CORSOrigins []string
	FrontendURL string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// Clerk
	ClerkSecretKey  string
	ClerkIssuerURL  string
	ClerkJWKSURL    string

	// AWS S3 / Cloudflare R2
	S3Endpoint        string
	S3Region          string
	S3Bucket          string
	S3AccessKeyID     string
	S3SecretAccessKey  string
	CDNBaseURL        string

	// Instagram
	InstagramAppID     string
	InstagramAppSecret string
	InstagramRedirectURI string

	// Video Processing
	MaxVideoDurationSec int
	MaxVideoSizeMB      int
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		CORSOrigins: getEnvSlice("CORS_ORIGINS", []string{"http://localhost:3000", "http://localhost:3001"}),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),

		DatabaseURL: getEnv("DATABASE_URL", "postgres://tars:tars_dev_password@localhost:5433/tars_social?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379/0"),

		ClerkSecretKey: getEnv("CLERK_SECRET_KEY", ""),
		ClerkIssuerURL: getEnv("CLERK_ISSUER_URL", ""),
		ClerkJWKSURL:   getEnv("CLERK_JWKS_URL", ""),

		S3Endpoint:       getEnv("S3_ENDPOINT", ""),
		S3Region:         getEnv("S3_REGION", "us-east-1"),
		S3Bucket:         getEnv("S3_BUCKET", "tars-media"),
		S3AccessKeyID:    getEnv("S3_ACCESS_KEY_ID", ""),
		S3SecretAccessKey: getEnv("S3_SECRET_ACCESS_KEY", ""),
		CDNBaseURL:       getEnv("CDN_BASE_URL", ""),

		InstagramAppID:       getEnv("INSTAGRAM_APP_ID", ""),
		InstagramAppSecret:   getEnv("INSTAGRAM_APP_SECRET", ""),
		InstagramRedirectURI: getEnv("INSTAGRAM_REDIRECT_URI", ""),

		MaxVideoDurationSec: getEnvInt("MAX_VIDEO_DURATION_SEC", 90),
		MaxVideoSizeMB:      getEnvInt("MAX_VIDEO_SIZE_MB", 250),
	}
}

// DSN returns the PostgreSQL connection string.
func (c *Config) DSN() string {
	return c.DatabaseURL
}

// Addr returns the server listen address.
func (c *Config) Addr() string {
	return fmt.Sprintf(":%s", c.Port)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return fallback
	}
	return i
}

func getEnvSlice(key string, fallback []string) []string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	parts := strings.Split(val, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}
