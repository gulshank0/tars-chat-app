package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Client wraps the AWS S3 SDK for media storage.
type S3Client struct {
	client     *s3.Client
	presigner  *s3.PresignClient
	bucket     string
	cdnBaseURL string
}

// NewS3Client creates a new S3/R2 client.
func NewS3Client(endpoint, region, bucket, accessKey, secretKey, cdnBaseURL string) (*S3Client, error) {
	resolver := aws.EndpointResolverWithOptionsFunc(
		func(service, reg string, options ...interface{}) (aws.Endpoint, error) {
			if endpoint != "" {
				return aws.Endpoint{URL: endpoint, SigningRegion: region}, nil
			}
			return aws.Endpoint{}, &aws.EndpointNotFoundError{}
		},
	)

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		awsconfig.WithEndpointResolverWithOptions(resolver),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		if endpoint != "" {
			o.UsePathStyle = true
		}
	})

	return &S3Client{
		client:     client,
		presigner:  s3.NewPresignClient(client),
		bucket:     bucket,
		cdnBaseURL: cdnBaseURL,
	}, nil
}

// GenerateUploadURL creates a presigned PUT URL for direct browser uploads.
func (s *S3Client) GenerateUploadURL(ctx context.Context, key, contentType string) (string, error) {
	req, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", fmt.Errorf("failed to presign upload: %w", err)
	}
	return req.URL, nil
}

// GenerateDownloadURL creates a presigned GET URL or returns the CDN URL.
func (s *S3Client) GenerateDownloadURL(ctx context.Context, key string) (string, error) {
	if s.cdnBaseURL != "" {
		return fmt.Sprintf("%s/%s", s.cdnBaseURL, key), nil
	}

	req, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(1*time.Hour))
	if err != nil {
		return "", fmt.Errorf("failed to presign download: %w", err)
	}
	return req.URL, nil
}

// DeleteObject removes an object from S3.
func (s *S3Client) DeleteObject(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	return err
}

// UploadFile streams a file body to S3 and returns the public URL.
func (s *S3Client) UploadFile(ctx context.Context, key string, body io.Reader, contentType string) (string, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Return CDN URL or presigned URL
	return s.GenerateDownloadURL(ctx, key)
}

// MediaKey returns the S3 key for a media file.
func MediaKey(userID, reelID, filename string) string {
	return fmt.Sprintf("reels/%s/%s/%s", userID, reelID, filename)
}

// ThumbnailKey returns the S3 key for a thumbnail.
func ThumbnailKey(userID, reelID string) string {
	return fmt.Sprintf("thumbnails/%s/%s/thumb.jpg", userID, reelID)
}
