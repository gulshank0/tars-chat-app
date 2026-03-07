package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

// CloudinaryClient wraps the Cloudinary SDK for media storage.
type CloudinaryClient struct {
	cld       *cloudinary.Cloudinary
	cloudName string
}

// NewCloudinaryClient creates a new Cloudinary client.
func NewCloudinaryClient(cloudName, apiKey, apiSecret string) (*CloudinaryClient, error) {
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Cloudinary: %w", err)
	}

	return &CloudinaryClient{
		cld:       cld,
		cloudName: cloudName,
	}, nil
}

// UploadFile uploads a file to Cloudinary and returns the secure public URL.
// The key is used as the public_id (folder path) in Cloudinary.
// contentType is used to determine the resource type (video or image).
func (c *CloudinaryClient) UploadFile(ctx context.Context, key string, body io.Reader, contentType string) (string, error) {
	resourceType := "auto"
	if strings.HasPrefix(contentType, "video/") {
		resourceType = "video"
	} else if strings.HasPrefix(contentType, "image/") {
		resourceType = "image"
	}

	// Remove file extension from the key to use as public_id
	// Cloudinary adds the extension automatically
	publicID := strings.TrimSuffix(key, ".mp4")
	publicID = strings.TrimSuffix(publicID, ".webm")
	publicID = strings.TrimSuffix(publicID, ".jpg")
	publicID = strings.TrimSuffix(publicID, ".png")

	result, err := c.cld.Upload.Upload(ctx, body, uploader.UploadParams{
		PublicID:     publicID,
		ResourceType: resourceType,
		Folder:       "", // folder is part of the key already
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to Cloudinary: %w", err)
	}

	return result.SecureURL, nil
}

// DeleteObject removes an object from Cloudinary by its public ID.
func (c *CloudinaryClient) DeleteObject(ctx context.Context, key string) error {
	// Remove file extension from the key to get the public_id
	publicID := strings.TrimSuffix(key, ".mp4")
	publicID = strings.TrimSuffix(publicID, ".webm")
	publicID = strings.TrimSuffix(publicID, ".jpg")
	publicID = strings.TrimSuffix(publicID, ".png")

	_, err := c.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: "video",
	})
	return err
}

// GetPublicURL returns the Cloudinary CDN URL for a given key.
func (c *CloudinaryClient) GetPublicURL(key string) string {
	return fmt.Sprintf("https://res.cloudinary.com/%s/video/upload/%s", c.cloudName, key)
}

// MediaKey returns the storage key for a media file.
func MediaKey(userID, reelID, filename string) string {
	return fmt.Sprintf("reels/%s/%s/%s", userID, reelID, filename)
}

// ThumbnailKey returns the storage key for a thumbnail.
func ThumbnailKey(userID, reelID string) string {
	return fmt.Sprintf("thumbnails/%s/%s/thumb.jpg", userID, reelID)
}
