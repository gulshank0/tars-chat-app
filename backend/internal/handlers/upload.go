package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/models"
	"github.com/gulshan/tars-social/internal/repository"
	"github.com/gulshan/tars-social/pkg/storage"
)

// UploadHandler handles direct file uploads — Cloudinary when configured, local fallback otherwise.
type UploadHandler struct {
	reelRepo       *repository.ReelRepo
	userRepo       *repository.UserRepo
	uploadDir      string
	cloudinaryClient *storage.CloudinaryClient
}

// NewUploadHandler creates a new UploadHandler.
func NewUploadHandler(reelRepo *repository.ReelRepo, userRepo *repository.UserRepo, uploadDir string, cld *storage.CloudinaryClient) *UploadHandler {
	os.MkdirAll(uploadDir, 0755)
	return &UploadHandler{reelRepo: reelRepo, userRepo: userRepo, uploadDir: uploadDir, cloudinaryClient: cld}
}

// UploadVideo handles multipart video file upload + reel creation in one step.
func (h *UploadHandler) UploadVideo(w http.ResponseWriter, r *http.Request) {
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

	// Parse multipart form (max 250MB)
	if err := r.ParseMultipartForm(250 << 20); err != nil {
		jsonError(w, "file too large or invalid form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("video")
	if err != nil {
		jsonError(w, "video file required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "video/") {
		jsonError(w, "only video files are allowed", http.StatusBadRequest)
		return
	}

	// Generate unique filename
	reelID := uuid.New()
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".mp4"
	}
	filename := fmt.Sprintf("%s%s", reelID.String(), ext)

	// Get form fields
	caption := r.FormValue("caption")
	hashtags := strings.Split(r.FormValue("hashtags"), ",")
	cleanHashtags := []string{}
	for _, h := range hashtags {
		h = strings.TrimSpace(h)
		if h != "" {
			cleanHashtags = append(cleanHashtags, h)
		}
	}

	var videoURL string

	// Upload to Cloudinary if configured, otherwise save locally
	if h.cloudinaryClient != nil {
		cloudinaryKey := storage.MediaKey(user.ID.String(), reelID.String(), filename)
		publicURL, err := h.cloudinaryClient.UploadFile(r.Context(), cloudinaryKey, file, contentType)
		if err != nil {
			jsonError(w, "failed to upload to Cloudinary", http.StatusInternalServerError)
			return
		}
		videoURL = publicURL
	} else {
		// Local fallback
		videoPath := filepath.Join(h.uploadDir, filename)
		dst, err := os.Create(videoPath)
		if err != nil {
			jsonError(w, "failed to save video", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			jsonError(w, "failed to write video", http.StatusInternalServerError)
			return
		}
		videoURL = fmt.Sprintf("/uploads/%s", filename)
	}

	thumbFilename := fmt.Sprintf("%s_thumb.jpg", reelID.String())
	thumbnailURL := fmt.Sprintf("/uploads/%s", thumbFilename)

	reel := &models.Reel{
		CreatorID:    user.ID,
		VideoURL:     videoURL,
		Caption:      caption,
		DurationMs:   0,
		Status:       models.ReelStatusReady,
		IsPublished:  true,
		Hashtags:     cleanHashtags,
		ThumbnailURL: &thumbnailURL,
	}

	if err := h.reelRepo.Create(r.Context(), reel); err != nil {
		jsonError(w, "failed to create reel", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, reel, http.StatusCreated)
}

// ServeUploads serves uploaded files (local mode only).
func (h *UploadHandler) ServeUploads(w http.ResponseWriter, r *http.Request) {
	filename := r.PathValue("filename")
	if filename == "" {
		http.NotFound(w, r)
		return
	}

	// Prevent directory traversal
	filename = filepath.Base(filename)
	filePath := filepath.Join(h.uploadDir, filename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.NotFound(w, r)
		return
	}

	// Set proper content type for videos
	if strings.HasSuffix(filename, ".mp4") {
		w.Header().Set("Content-Type", "video/mp4")
	} else if strings.HasSuffix(filename, ".webm") {
		w.Header().Set("Content-Type", "video/webm")
	}

	// Enable range requests for video seeking
	http.ServeFile(w, r, filePath)
}
