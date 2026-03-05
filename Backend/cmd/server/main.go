package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	"github.com/gulshan/tars-social/internal/config"
	"github.com/gulshan/tars-social/internal/handlers"
	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/repository"
	"github.com/gulshan/tars-social/pkg/storage"
)

func main() {
	cfg := config.Load()

	// ---- Database ----
	db, err := sql.Open("postgres", cfg.DSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}
	log.Println("✅ Connected to PostgreSQL")

	// Run migrations
	if err := runMigrations(db); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("✅ Migrations applied")

	// ---- S3 Storage ----
	var s3Client *storage.S3Client
	if cfg.S3AccessKeyID != "" {
		s3Client, err = storage.NewS3Client(
			cfg.S3Endpoint, cfg.S3Region, cfg.S3Bucket,
			cfg.S3AccessKeyID, cfg.S3SecretAccessKey, cfg.CDNBaseURL,
		)
		if err != nil {
			log.Printf("⚠️  S3 client not initialized: %v", err)
		} else {
			log.Println("✅ S3 client initialized")
		}
	} else {
		log.Println("ℹ️  S3 not configured — using local file uploads")
	}

	// ---- Repositories ----
	userRepo := repository.NewUserRepo(db)
	socialRepo := repository.NewSocialRepo(db)
	reelRepo := repository.NewReelRepo(db)
	engagementRepo := repository.NewEngagementRepo(db)
	notifRepo := repository.NewNotificationRepo(db)

	// ---- Handlers ----
	profileH := handlers.NewProfileHandler(userRepo, socialRepo)
	socialH := handlers.NewSocialHandler(socialRepo, userRepo, notifRepo)
	reelsH := handlers.NewReelsHandler(reelRepo, userRepo, engagementRepo, s3Client)
	engagementH := handlers.NewEngagementHandler(engagementRepo, userRepo, reelRepo, notifRepo)
	notifH := handlers.NewNotificationsHandler(notifRepo, userRepo)
	uploadH := handlers.NewUploadHandler(reelRepo, userRepo, "./uploads")

	// ---- Middleware ----
	clerkAuth := middleware.NewClerkAuth(cfg.ClerkIssuerURL, cfg.ClerkJWKSURL, []string{
		"/api/health",
		"/api/v1/profile/sync",
		"/uploads/",
	})
	rateLimiter := middleware.NewRateLimiter(middleware.DefaultLimits["global"])
	corsMiddleware := middleware.CORS([]string{"http://localhost:3000", "http://localhost:3001", "*"})

	// ---- Router ----
	mux := http.NewServeMux()

	// Health check (no auth)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"tars-social"}`))
	})

	// Profile sync (internal — from webhook)
	mux.HandleFunc("POST /api/v1/profile/sync", profileH.SyncProfile)

	// --- Authenticated routes ---
	// Profile
	mux.HandleFunc("GET /api/v1/profile", profileH.GetMyProfile)
	mux.HandleFunc("PUT /api/v1/profile", profileH.UpdateMyProfile)
	mux.HandleFunc("GET /api/v1/users/{username}/profile", profileH.GetUserProfile)
	mux.HandleFunc("GET /api/v1/users/search", profileH.SearchUsers)

	// Social graph
	mux.HandleFunc("POST /api/v1/users/{id}/follow", socialH.FollowUser)
	mux.HandleFunc("DELETE /api/v1/users/{id}/follow", socialH.UnfollowUser)
	mux.HandleFunc("GET /api/v1/users/{id}/followers", socialH.GetFollowers)
	mux.HandleFunc("GET /api/v1/users/{id}/following", socialH.GetFollowing)

	// Reels
	mux.HandleFunc("POST /api/v1/reels/upload-url", reelsH.GetUploadURL)
	mux.HandleFunc("POST /api/v1/reels", reelsH.CreateReel)
	mux.HandleFunc("GET /api/v1/reels/{id}", reelsH.GetReel)
	mux.HandleFunc("DELETE /api/v1/reels/{id}", reelsH.DeleteReel)
	mux.HandleFunc("GET /api/v1/users/{id}/reels", reelsH.GetUserReels)

	// Feed
	mux.HandleFunc("GET /api/v1/feed", reelsH.GetFeed)
	mux.HandleFunc("GET /api/v1/feed/trending", reelsH.GetTrending)

	// Engagement
	mux.HandleFunc("POST /api/v1/reels/{id}/like", engagementH.LikeReel)
	mux.HandleFunc("DELETE /api/v1/reels/{id}/like", engagementH.UnlikeReel)
	mux.HandleFunc("POST /api/v1/reels/{id}/comments", engagementH.AddComment)
	mux.HandleFunc("DELETE /api/v1/comments/{id}", engagementH.DeleteComment)
	mux.HandleFunc("POST /api/v1/reels/{id}/save", engagementH.SaveReel)
	mux.HandleFunc("DELETE /api/v1/reels/{id}/save", engagementH.UnsaveReel)
	mux.HandleFunc("POST /api/v1/reels/{id}/view", engagementH.RecordView)

	// Notifications
	mux.HandleFunc("GET /api/v1/notifications", notifH.GetNotifications)
	mux.HandleFunc("POST /api/v1/notifications/read", notifH.MarkAsRead)
	mux.HandleFunc("GET /api/v1/notifications/unread-count", notifH.UnreadCount)

	// Uploads (local dev)
	mux.HandleFunc("POST /api/v1/upload/video", uploadH.UploadVideo)
	mux.HandleFunc("GET /uploads/{filename}", uploadH.ServeUploads)

	// ---- Apply middleware chain ----
	var handler http.Handler = mux
	handler = clerkAuth.Middleware(handler)   // JWT validation
	handler = rateLimiter.Middleware(handler) // Rate limiting
	handler = corsMiddleware(handler)         // CORS

	// ---- Server ----
	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("🛑 Shutting down gracefully...")
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Fatalf("Server forced to shutdown: %v", err)
		}
	}()

	log.Printf("🚀 Tars Social API running on %s", cfg.Addr())
	log.Printf("   Health: http://localhost%s/api/health", cfg.Addr())
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

// runMigrations applies SQL migration files in order.
func runMigrations(db *sql.DB) error {
	// Find the migrations directory relative to the binary or working directory
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		// Try relative to the Backend directory
		migrationsDir = filepath.Join("..", "migrations")
		if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
			return fmt.Errorf("migrations directory not found")
		}
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations: %w", err)
	}

	// Sort by filename to ensure order
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		content, err := os.ReadFile(filepath.Join(migrationsDir, entry.Name()))
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", entry.Name(), err)
		}

		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", entry.Name(), err)
		}

		log.Printf("   ✅ Applied: %s", entry.Name())
	}

	return nil
}
