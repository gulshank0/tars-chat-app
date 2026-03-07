# Deployment Guide

## Cloudinary — Media Storage Configuration

Your backend uses the Cloudinary Go SDK (`backend/pkg/storage/cloudinary.go`) for storing reels, thumbnails, and all media content. Cloudinary provides a generous free tier with 25GB storage and auto-optimized video delivery.

### 1. Create a Cloudinary Account

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. After sign-in, go to your **Dashboard**
3. You'll see your **Cloud Name**, **API Key**, and **API Secret**

### 2. Update `backend/.env`

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

| Variable                | Where to Find          |
| ----------------------- | ---------------------- |
| `CLOUDINARY_CLOUD_NAME` | Dashboard → Cloud Name |
| `CLOUDINARY_API_KEY`    | Dashboard → API Key    |
| `CLOUDINARY_API_SECRET` | Dashboard → API Secret |

### 3. Features Included

- **Auto-format & quality**: Cloudinary automatically serves optimal formats (WebM for Chrome, MP4 for Safari)
- **CDN delivery**: All media is served via Cloudinary's global CDN
- **Video transformations**: Thumbnail generation, transcoding, etc. built-in
- **No CORS config needed**: Uploads go through the backend (no browser-direct uploads)

### 4. Upload Flow

```
Frontend → POST /api/v1/upload/video (multipart) → Backend → Cloudinary SDK → Cloudinary CDN
```

The backend receives the video file via multipart form, uploads it to Cloudinary using the Go SDK, and stores the returned CDN URL in the database.

### 5. For Production (Render)

Set these environment variables in your Render dashboard:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Local Development Setup

For local development, ensure:

1. Docker containers are running: `cd backend && docker compose up -d`
2. `backend/.env` uses local URLs (default):
   - `DATABASE_URL=postgresql://tars:tars_dev_password@localhost:5433/tars_social?sslmode=disable`
   - `REDIS_URL=redis://localhost:6379/0`
3. `.env.local` points to local backend: `NEXT_PUBLIC_API_URL=http://localhost:8080`
4. Start backend: `cd backend && go run ./cmd/server/`
5. Start frontend: `npm run dev`

> **Note**: If Cloudinary credentials are not set, the backend falls back to saving files locally in `./uploads/`.

---

## Current Deployment Setup

| Service            | Platform                             |
| ------------------ | ------------------------------------ |
| Frontend (Next.js) | Vercel                               |
| Backend (Go)       | Render                               |
| Convex             | Convex Cloud (`moonlit-sparrow-237`) |
| Database           | Neon PostgreSQL                      |
| Redis              | Upstash                              |
| Media Storage      | Cloudinary                           |
