package pukucode

import (
	"context"
	"net/http"
	"net/url"
	"slices"

	"github.com/pukucode/pukucode-sdk-go/internal/apijson"
	"github.com/pukucode/pukucode-sdk-go/internal/apiquery"
	"github.com/pukucode/pukucode-sdk-go/internal/param"
	"github.com/pukucode/pukucode-sdk-go/internal/requestconfig"
	"github.com/pukucode/pukucode-sdk-go/option"
)

// ConfigService contains methods for interacting with the config API.
type ConfigService struct {
	Options []option.RequestOption
}

// NewConfigService generates a new service.
func NewConfigService(opts ...option.RequestOption) (r *ConfigService) {
	r = &ConfigService{}
	r.Options = opts
	return
}

// Get gets the configuration
func (r *ConfigService) Get(ctx context.Context, query ConfigGetParams, opts ...option.RequestOption) (res *Config, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "config"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Providers gets the list of providers
func (r *ConfigService) Providers(ctx context.Context, query ConfigProvidersParams, opts ...option.RequestOption) (res *ProvidersResponse, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "config/providers"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

type ConfigGetParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r ConfigGetParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type ConfigProvidersParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r ConfigProvidersParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// ProvidersResponse represents the response from the providers endpoint
type ProvidersResponse struct {
	Providers []Provider        `json:"providers,required"`
	Default   map[string]string `json:"default"`
	JSON      providersResponseJSON `json:"-"`
}

type providersResponseJSON struct {
	Providers   apijson.Field
	Default     apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *ProvidersResponse) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

// Provider represents an AI provider
type Provider struct {
	ID     string            `json:"id,required"`
	Name   string            `json:"name,required"`
	Models map[string]Model  `json:"models"`
	Env    []string          `json:"env"`
	API    string            `json:"api"`
	NPM    string            `json:"npm"`
	Doc    string            `json:"doc"`
	JSON   providerJSON      `json:"-"`
}

type providerJSON struct {
	ID          apijson.Field
	Name        apijson.Field
	Models      apijson.Field
	Env         apijson.Field
	API         apijson.Field
	NPM         apijson.Field
	Doc         apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Provider) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

// Model represents an AI model
type Model struct {
	ID          string    `json:"id,required"`
	Name        string    `json:"name,required"`
	Attachment  bool      `json:"attachment"`
	Reasoning   bool      `json:"reasoning"`
	Temperature bool      `json:"temperature"`
	ToolCall    bool      `json:"tool_call"`
	Knowledge   string    `json:"knowledge"`
	ReleaseDate string    `json:"release_date"`
	JSON        modelJSON `json:"-"`
}

type modelJSON struct {
	ID          apijson.Field
	Name        apijson.Field
	Attachment  apijson.Field
	Reasoning   apijson.Field
	Temperature apijson.Field
	ToolCall    apijson.Field
	Knowledge   apijson.Field
	ReleaseDate apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Model) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

// Config represents the configuration
type Config struct {
	Agent    map[string]interface{} `json:"agent"`
	Mode     map[string]interface{} `json:"mode"`
	Command  map[string]interface{} `json:"command"`
	Plugin   []interface{}          `json:"plugin"`
	Username string                 `json:"username"`
	JSON     configJSON             `json:"-"`
}

type configJSON struct {
	Agent       apijson.Field
	Mode        apijson.Field
	Command     apijson.Field
	Plugin      apijson.Field
	Username    apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Config) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}
