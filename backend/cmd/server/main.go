package main

import (
	"bufio"
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

// loadEnvFile reads a .env file and sets env vars (won't overwrite existing ones).
func loadEnvFile(path string) {
	f, err := os.Open(path)
	if err != nil {
		return // silently skip if no .env file
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
}

func main() {
	// Load .env file if present
	loadEnvFile(".env")
	cfg := config.Load()

	startTime := time.Now() // for uptime tracking

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

	// ---- Cloudinary Storage ----
	var cloudinaryClient *storage.CloudinaryClient
	if cfg.CloudinaryCloudName != "" {
		cloudinaryClient, err = storage.NewCloudinaryClient(
			cfg.CloudinaryCloudName, cfg.CloudinaryAPIKey, cfg.CloudinaryAPISecret,
		)
		if err != nil {
			log.Printf("⚠️  Cloudinary client not initialized: %v", err)
		} else {
			log.Println("✅ Cloudinary client initialized")
		}
	} else {
		log.Println("ℹ️  Cloudinary not configured — using local file uploads")
	}

	// ---- Repositories ----
	userRepo := repository.NewUserRepo(db)
	socialRepo := repository.NewSocialRepo(db)
	reelRepo := repository.NewReelRepo(db)
	engagementRepo := repository.NewEngagementRepo(db)
	notifRepo := repository.NewNotificationRepo(db)
	reportRepo := repository.NewReportRepo(db)

	// ---- Handlers ----
	profileH := handlers.NewProfileHandler(userRepo, socialRepo)
	socialH := handlers.NewSocialHandler(socialRepo, userRepo, notifRepo)
	reelsH := handlers.NewReelsHandler(reelRepo, userRepo, engagementRepo, cloudinaryClient)
	engagementH := handlers.NewEngagementHandler(engagementRepo, userRepo, reelRepo, notifRepo)
	notifH := handlers.NewNotificationsHandler(notifRepo, userRepo)
	uploadH := handlers.NewUploadHandler(reelRepo, userRepo, "./uploads", cloudinaryClient)
	instagramH := handlers.NewInstagramHandler(userRepo, reelRepo, cfg)
	reportH := handlers.NewReportHandler(reportRepo, userRepo)

	// ---- Middleware ----
	clerkAuth := middleware.NewClerkAuth(cfg.ClerkIssuerURL, cfg.ClerkJWKSURL, []string{
		"/api/health",
		"/api/v1/profile/sync",
		"/uploads/",
	})
	rateLimiter := middleware.NewRateLimiter(middleware.DefaultLimits["global"])
	uploadLimiter := middleware.NewRateLimiter(middleware.DefaultLimits["upload"])
	followLimiter := middleware.NewRateLimiter(middleware.DefaultLimits["follow"])
	corsMiddleware := middleware.CORS([]string{"http://localhost:3000", "http://localhost:3001","https://tars-chat-app-eta.vercel.app", "*"})

	// ---- Router ----
	mux := http.NewServeMux()

	// Health check (no auth) — enhanced with DB ping and uptime
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "ok"
		if err := db.Ping(); err != nil {
			dbStatus = "error: " + err.Error()
		}
		uptime := time.Since(startTime).Round(time.Second).String()
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","service":"tars-social","database":"%s","uptime":"%s"}`, dbStatus, uptime)
	})

	// Profile sync (internal — from webhook)
	mux.HandleFunc("POST /api/v1/profile/sync", profileH.SyncProfile)

	// --- Authenticated routes ---
	// Profile
	mux.HandleFunc("GET /api/v1/profile", profileH.GetMyProfile)
	mux.HandleFunc("PUT /api/v1/profile", profileH.UpdateMyProfile)
	mux.HandleFunc("GET /api/v1/users/{username}/profile", profileH.GetUserProfile)
	mux.HandleFunc("GET /api/v1/users/search", profileH.SearchUsers)

	// Social graph (follow has per-route rate limit)
	mux.HandleFunc("POST /api/v1/users/{id}/follow", func(w http.ResponseWriter, r *http.Request) {
		key := "anon"
		if uid, ok := middleware.GetClerkUserID(r.Context()); ok {
			key = uid
		}
		if !followLimiter.Allow(key) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"follow rate limit exceeded"}`))
			return
		}
		socialH.FollowUser(w, r)
	})
	mux.HandleFunc("DELETE /api/v1/users/{id}/follow", socialH.UnfollowUser)
	mux.HandleFunc("GET /api/v1/users/{id}/followers", socialH.GetFollowers)
	mux.HandleFunc("GET /api/v1/users/{id}/following", socialH.GetFollowing)

	// Reels (upload has per-route rate limit)
	mux.HandleFunc("POST /api/v1/reels/upload-url", reelsH.GetUploadURL)
	mux.HandleFunc("POST /api/v1/reels", func(w http.ResponseWriter, r *http.Request) {
		key := "anon"
		if uid, ok := middleware.GetClerkUserID(r.Context()); ok {
			key = uid
		}
		if !uploadLimiter.Allow(key) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"upload rate limit exceeded"}`))
			return
		}
		reelsH.CreateReel(w, r)
	})
	mux.HandleFunc("GET /api/v1/reels/{id}", reelsH.GetReel)
	mux.HandleFunc("DELETE /api/v1/reels/{id}", reelsH.DeleteReel)
	mux.HandleFunc("GET /api/v1/users/{id}/reels", reelsH.GetUserReels)
	mux.HandleFunc("GET /api/v1/reels/search", reelsH.SearchByHashtag)

	// Feed
	mux.HandleFunc("GET /api/v1/feed", reelsH.GetFeed)
	mux.HandleFunc("GET /api/v1/feed/trending", reelsH.GetTrending)
	mux.HandleFunc("GET /api/v1/hashtags/popular", reelsH.GetPopularHashtags)

	// Engagement
	mux.HandleFunc("POST /api/v1/reels/{id}/like", engagementH.LikeReel)
	mux.HandleFunc("DELETE /api/v1/reels/{id}/like", engagementH.UnlikeReel)
	mux.HandleFunc("POST /api/v1/reels/{id}/comments", engagementH.AddComment)
	mux.HandleFunc("GET /api/v1/reels/{id}/comments", engagementH.GetComments)
	mux.HandleFunc("DELETE /api/v1/comments/{id}", engagementH.DeleteComment)
	mux.HandleFunc("POST /api/v1/reels/{id}/save", engagementH.SaveReel)
	mux.HandleFunc("DELETE /api/v1/reels/{id}/save", engagementH.UnsaveReel)
	mux.HandleFunc("POST /api/v1/reels/{id}/view", engagementH.RecordView)
	mux.HandleFunc("POST /api/v1/reels/{id}/share", engagementH.ShareReel)

	// Notifications
	mux.HandleFunc("GET /api/v1/notifications", notifH.GetNotifications)
	mux.HandleFunc("POST /api/v1/notifications/read", notifH.MarkAsRead)
	mux.HandleFunc("GET /api/v1/notifications/unread-count", notifH.UnreadCount)

	// Instagram
	mux.HandleFunc("GET /api/v1/instagram/auth-url", instagramH.GetAuthURL)
	mux.HandleFunc("GET /api/v1/instagram/callback", instagramH.HandleCallback)
	mux.HandleFunc("POST /api/v1/instagram/disconnect", instagramH.DisconnectInstagram)
	mux.HandleFunc("GET /api/v1/instagram/reels", instagramH.GetInstagramReels)
	mux.HandleFunc("POST /api/v1/instagram/import", instagramH.ImportInstagramReel)
	mux.HandleFunc("GET /api/v1/instagram/oembed", instagramH.GetOEmbed)

	// Reports / Moderation
	mux.HandleFunc("POST /api/v1/reports", reportH.CreateReport)

	// Uploads (local dev)
	mux.HandleFunc("POST /api/v1/upload/video", uploadH.UploadVideo)
	mux.HandleFunc("GET /uploads/{filename}", uploadH.ServeUploads)

	// ---- Apply middleware chain ----
	var handler http.Handler = mux
	handler = clerkAuth.Middleware(handler)   // JWT validation
	handler = rateLimiter.Middleware(handler) // Rate limiting
	handler = middleware.RequestLogger(handler) // Structured logging
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
