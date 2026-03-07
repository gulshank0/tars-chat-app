package middleware

import (
	"log"
	"net/http"
	"time"
)

// responseCapture wraps http.ResponseWriter to capture the status code.
type responseCapture struct {
	http.ResponseWriter
	statusCode int
}

func (rc *responseCapture) WriteHeader(code int) {
	rc.statusCode = code
	rc.ResponseWriter.WriteHeader(code)
}

// RequestLogger is middleware that logs structured information about each request.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		rc := &responseCapture{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rc, r)

		duration := time.Since(start)
		userID := "anon"
		if uid, ok := GetClerkUserID(r.Context()); ok {
			userID = uid
		}

		log.Printf("[%s] %s %s → %d (%s) user=%s",
			r.Method,
			r.URL.Path,
			r.RemoteAddr,
			rc.statusCode,
			duration.Round(time.Millisecond),
			userID,
		)
	})
}
