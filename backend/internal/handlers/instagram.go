package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/gulshan/tars-social/internal/config"
	"github.com/gulshan/tars-social/internal/middleware"
	"github.com/gulshan/tars-social/internal/models"
	"github.com/gulshan/tars-social/internal/repository"
)

// InstagramHandler handles Instagram OAuth and media endpoints.
type InstagramHandler struct {
	userRepo *repository.UserRepo
	reelRepo *repository.ReelRepo
	cfg      *config.Config
}

// NewInstagramHandler creates a new InstagramHandler.
func NewInstagramHandler(userRepo *repository.UserRepo, reelRepo *repository.ReelRepo, cfg *config.Config) *InstagramHandler {
	return &InstagramHandler{userRepo: userRepo, reelRepo: reelRepo, cfg: cfg}
}

// GetAuthURL returns the Instagram OAuth authorization URL.
func (h *InstagramHandler) GetAuthURL(w http.ResponseWriter, r *http.Request) {
	if h.cfg.InstagramAppID == "" {
		jsonError(w, "Instagram integration not configured", http.StatusServiceUnavailable)
		return
	}

	authURL := fmt.Sprintf(
		"https://www.instagram.com/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=%s",
		url.QueryEscape(h.cfg.InstagramAppID),
		url.QueryEscape(h.cfg.InstagramRedirectURI),
		url.QueryEscape("instagram_business_basic,instagram_business_content_publish"),
	)

	jsonResponse(w, map[string]string{"authUrl": authURL}, http.StatusOK)
}

// HandleCallback exchanges the auth code for an access token.
func (h *InstagramHandler) HandleCallback(w http.ResponseWriter, r *http.Request) {
	clerkID, ok := middleware.GetClerkUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		jsonError(w, "missing authorization code", http.StatusBadRequest)
		return
	}

	user, _ := h.userRepo.GetByClerkID(r.Context(), clerkID)
	if user == nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}

	// Exchange code for short-lived token
	shortToken, igUserID, err := h.exchangeCodeForToken(code)
	if err != nil {
		jsonError(w, "failed to exchange authorization code", http.StatusBadGateway)
		return
	}

	// Exchange short-lived token for long-lived token
	longToken, err := h.exchangeForLongLivedToken(shortToken)
	if err != nil {
		// Fall back to short-lived token if exchange fails
		longToken = shortToken
	}

	// Store the token
	if err := h.userRepo.SaveInstagramToken(r.Context(), user.ID, igUserID, longToken); err != nil {
		jsonError(w, "failed to save Instagram connection", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"connected":   true,
		"instagramId": igUserID,
	}, http.StatusOK)
}

// DisconnectInstagram removes the stored Instagram token.
func (h *InstagramHandler) DisconnectInstagram(w http.ResponseWriter, r *http.Request) {
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

	if err := h.userRepo.ClearInstagramToken(r.Context(), user.ID); err != nil {
		jsonError(w, "failed to disconnect Instagram", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"connected": false}, http.StatusOK)
}

// instagramMedia represents a single IG media item from the Graph API.
type instagramMedia struct {
	ID           string `json:"id"`
	Caption      string `json:"caption"`
	MediaType    string `json:"media_type"`
	MediaURL     string `json:"media_url"`
	ThumbnailURL string `json:"thumbnail_url"`
	Timestamp    string `json:"timestamp"`
	Permalink    string `json:"permalink"`
}

// GetInstagramReels fetches the user's Instagram reels (videos).
func (h *InstagramHandler) GetInstagramReels(w http.ResponseWriter, r *http.Request) {
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

	token, err := h.userRepo.GetInstagramToken(r.Context(), user.ID)
	if err != nil || token == "" {
		jsonError(w, "Instagram not connected", http.StatusBadRequest)
		return
	}

	// Fetch media from Instagram Graph API
	apiURL := fmt.Sprintf(
		"https://graph.instagram.com/v21.0/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=%s",
		url.QueryEscape(token),
	)

	resp, err := http.Get(apiURL)
	if err != nil {
		jsonError(w, "failed to fetch Instagram media", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		jsonError(w, "Instagram API error", http.StatusBadGateway)
		return
	}

	var result struct {
		Data []instagramMedia `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		jsonError(w, "failed to parse Instagram response", http.StatusInternalServerError)
		return
	}

	// Filter to VIDEO/REELS only
	var reels []instagramMedia
	for _, m := range result.Data {
		if m.MediaType == "VIDEO" {
			reels = append(reels, m)
		}
	}

	if reels == nil {
		reels = []instagramMedia{}
	}

	jsonResponse(w, reels, http.StatusOK)
}

// ImportInstagramReel imports a specific IG reel into the platform.
func (h *InstagramHandler) ImportInstagramReel(w http.ResponseWriter, r *http.Request) {
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

	var req struct {
		MediaID      string   `json:"mediaId"`
		MediaURL     string   `json:"mediaUrl"`
		ThumbnailURL string   `json:"thumbnailUrl"`
		Caption      string   `json:"caption"`
		Hashtags     []string `json:"hashtags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.MediaID == "" || req.MediaURL == "" {
		jsonError(w, "mediaId and mediaUrl are required", http.StatusBadRequest)
		return
	}

	// Check if already imported
	existing, _ := h.reelRepo.GetByIGMediaID(r.Context(), req.MediaID)
	if existing != nil {
		jsonError(w, "this reel has already been imported", http.StatusConflict)
		return
	}

	// Create reel record linked to Instagram
	reel := &models.Reel{
		CreatorID:    user.ID,
		VideoURL:     req.MediaURL,
		ThumbnailURL: &req.ThumbnailURL,
		Caption:      req.Caption,
		IsPublished:  true,
		IsInstagram:  true,
		IGMediaID:    &req.MediaID,
		Status:       models.ReelStatusReady,
		Hashtags:     req.Hashtags,
	}

	if err := h.reelRepo.Create(r.Context(), reel); err != nil {
		jsonError(w, "failed to import reel", http.StatusInternalServerError)
		return
	}

	// Upsert hashtags
	if len(req.Hashtags) > 0 {
		go func() {
			_ = h.reelRepo.UpsertHashtags(context.Background(), req.Hashtags)
		}()
	}

	jsonResponse(w, reel, http.StatusCreated)
}

// GetOEmbed proxies an oEmbed request for a public Instagram URL.
func (h *InstagramHandler) GetOEmbed(w http.ResponseWriter, r *http.Request) {
	igURL := r.URL.Query().Get("url")
	if igURL == "" {
		jsonError(w, "url parameter required", http.StatusBadRequest)
		return
	}

	// Use Facebook oEmbed endpoint (requires app access token)
	appToken := h.cfg.InstagramAppID + "|" + h.cfg.InstagramAppSecret
	oembedURL := fmt.Sprintf(
		"https://graph.facebook.com/v21.0/instagram_oembed?url=%s&access_token=%s",
		url.QueryEscape(igURL),
		url.QueryEscape(appToken),
	)

	resp, err := http.Get(oembedURL)
	if err != nil {
		jsonError(w, "failed to fetch oEmbed data", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// --- Internal helpers ---

type igTokenResponse struct {
	AccessToken string `json:"access_token"`
	UserID      string `json:"user_id"`
}

func (h *InstagramHandler) exchangeCodeForToken(code string) (string, string, error) {
	data := url.Values{
		"client_id":     {h.cfg.InstagramAppID},
		"client_secret": {h.cfg.InstagramAppSecret},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {h.cfg.InstagramRedirectURI},
		"code":          {code},
	}

	resp, err := http.Post(
		"https://api.instagram.com/oauth/access_token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return "", "", fmt.Errorf("token exchange request failed: %w", err)
	}
	defer resp.Body.Close()

	var result igTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", fmt.Errorf("failed to decode token response: %w", err)
	}

	if result.AccessToken == "" {
		return "", "", fmt.Errorf("no access token in response")
	}

	return result.AccessToken, result.UserID, nil
}

func (h *InstagramHandler) exchangeForLongLivedToken(shortToken string) (string, error) {
	apiURL := fmt.Sprintf(
		"https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=%s&access_token=%s",
		url.QueryEscape(h.cfg.InstagramAppSecret),
		url.QueryEscape(shortToken),
	)

	resp, err := http.Get(apiURL)
	if err != nil {
		return "", fmt.Errorf("long-lived token exchange failed: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode long-lived token: %w", err)
	}

	if result.AccessToken == "" {
		return "", fmt.Errorf("no long-lived token in response")
	}

	return result.AccessToken, nil
}
