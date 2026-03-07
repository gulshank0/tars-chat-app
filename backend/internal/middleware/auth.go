package middleware

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	// ClerkUserIDKey is the context key for the authenticated Clerk user ID.
	ClerkUserIDKey contextKey = "clerkUserID"
)

// JWKS represents a JSON Web Key Set.
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a single JSON Web Key.
type JWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
	Alg string `json:"alg"`
}

// ClerkAuth is middleware that validates Clerk-issued JWTs.
type ClerkAuth struct {
	issuerURL   string
	jwksURL     string
	publicPaths []string // paths that bypass authentication

	mu      sync.RWMutex
	keys    map[string]*rsa.PublicKey
	fetched time.Time
}

// NewClerkAuth creates a new Clerk auth middleware.
// jwksURL is typically: https://<your-clerk-domain>/.well-known/jwks.json
// publicPaths are URL paths that skip authentication (e.g., "/api/health").
func NewClerkAuth(issuerURL, jwksURL string, publicPaths []string) *ClerkAuth {
	return &ClerkAuth{
		issuerURL:   issuerURL,
		jwksURL:     jwksURL,
		publicPaths: publicPaths,
		keys:        make(map[string]*rsa.PublicKey),
	}
}

// Middleware returns an HTTP middleware that validates the Authorization header.
func (ca *ClerkAuth) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for public paths
		for _, p := range ca.publicPaths {
			if strings.HasPrefix(r.URL.Path, p) {
				next.ServeHTTP(w, r)
				return
			}
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
			return
		}
		tokenStr := parts[1]

		// Parse and validate the JWT
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}

			kid, ok := token.Header["kid"].(string)
			if !ok {
				return nil, fmt.Errorf("missing kid in token header")
			}

			key, err := ca.getKey(kid)
			if err != nil {
				return nil, err
			}
			return key, nil
		}, jwt.WithIssuer(ca.issuerURL), jwt.WithValidMethods([]string{"RS256"}))

		if err != nil || !token.Valid {
			http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
			return
		}

		sub, ok := claims["sub"].(string)
		if !ok || sub == "" {
			http.Error(w, `{"error":"missing subject in token"}`, http.StatusUnauthorized)
			return
		}

		// Store the Clerk user ID in context
		ctx := context.WithValue(r.Context(), ClerkUserIDKey, sub)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetClerkUserID extracts the Clerk user ID from the request context.
func GetClerkUserID(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(ClerkUserIDKey).(string)
	return id, ok
}

// getKey retrieves an RSA public key by kid, fetching JWKS if needed.
func (ca *ClerkAuth) getKey(kid string) (*rsa.PublicKey, error) {
	ca.mu.RLock()
	key, ok := ca.keys[kid]
	fetched := ca.fetched
	ca.mu.RUnlock()

	if ok && time.Since(fetched) < 1*time.Hour {
		return key, nil
	}

	// Fetch/refresh JWKS
	if err := ca.fetchJWKS(); err != nil {
		if ok {
			return key, nil // use stale key if fetch fails
		}
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}

	ca.mu.RLock()
	defer ca.mu.RUnlock()
	key, ok = ca.keys[kid]
	if !ok {
		return nil, fmt.Errorf("key %s not found in JWKS", kid)
	}
	return key, nil
}

// fetchJWKS fetches the JWKS from Clerk and caches the keys.
func (ca *ClerkAuth) fetchJWKS() error {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(ca.jwksURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned %d", resp.StatusCode)
	}

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return err
	}

	ca.mu.Lock()
	defer ca.mu.Unlock()

	for _, jwk := range jwks.Keys {
		if jwk.Kty != "RSA" || jwk.Use != "sig" {
			continue
		}

		nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
		if err != nil {
			continue
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
		if err != nil {
			continue
		}

		n := new(big.Int).SetBytes(nBytes)
		e := int(new(big.Int).SetBytes(eBytes).Int64())

		ca.keys[jwk.Kid] = &rsa.PublicKey{N: n, E: e}
	}

	ca.fetched = time.Now()
	return nil
}
