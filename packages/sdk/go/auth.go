package pukucode

import (
	"context"
	"net/http"
	"net/url"
	"slices"

	"github.com/pukucode/pukucode-sdk-go/internal/apijson"
	"github.com/pukucode/pukucode-sdk-go/internal/param"
	"github.com/pukucode/pukucode-sdk-go/internal/requestconfig"
	"github.com/pukucode/pukucode-sdk-go/option"
)

// AuthService contains methods for interacting with the auth API.
type AuthService struct {
	Options []option.RequestOption
}

// NewAuthService generates a new service.
func NewAuthService(opts ...option.RequestOption) (r *AuthService) {
	r = &AuthService{}
	r.Options = opts
	return
}

// Set sets authentication credentials for a provider
func (r *AuthService) Set(ctx context.Context, id string, body AuthSetParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "auth/" + url.PathEscape(id)
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPut, path, body, nil, opts...)
	return
}

// AuthSetParams represents authentication parameters
// This is a union type that can be OAuth, API key, or WellKnown
type AuthSetParams struct {
	// Type of authentication: "oauth", "api", or "wellknown"
	Type param.Field[string] `json:"type,required"`

	// For OAuth
	Refresh param.Field[string] `json:"refresh"`
	Access  param.Field[string] `json:"access"`
	Expires param.Field[int64]  `json:"expires"`

	// For API key
	Key param.Field[string] `json:"key"`

	// For WellKnown
	Token param.Field[string] `json:"token"`
}

func (r AuthSetParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

// Helper constructors for different auth types

// NewOAuthParams creates OAuth authentication parameters
func NewOAuthParams(refresh, access string, expires int64) AuthSetParams {
	return AuthSetParams{
		Type:    F("oauth"),
		Refresh: F(refresh),
		Access:  F(access),
		Expires: F(expires),
	}
}

// NewAPIKeyParams creates API key authentication parameters
func NewAPIKeyParams(key string) AuthSetParams {
	return AuthSetParams{
		Type: F("api"),
		Key:  F(key),
	}
}

// NewWellKnownParams creates WellKnown authentication parameters
func NewWellKnownParams(key, token string) AuthSetParams {
	return AuthSetParams{
		Type:  F("wellknown"),
		Key:   F(key),
		Token: F(token),
	}
}
