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

// AppService contains methods for interacting with the app API.
type AppService struct {
	Options []option.RequestOption
}

// NewAppService generates a new service.
func NewAppService(opts ...option.RequestOption) (r *AppService) {
	r = &AppService{}
	r.Options = opts
	return
}

// Log sends a log message
func (r *AppService) Log(ctx context.Context, body AppLogParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "log"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, nil, opts...)
	return
}

// Agents lists all available agents
func (r *AppService) Agents(ctx context.Context, query AppAgentsParams, opts ...option.RequestOption) (res []Agent, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "agent"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Providers lists all AI providers
func (r *AppService) Providers(ctx context.Context, query AppProvidersParams, opts ...option.RequestOption) (res *AppProvidersResponse, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "config/providers"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

type AppLogParams struct {
	Service param.Field[string]                 `json:"service,required"`
	Level   param.Field[string]                 `json:"level,required"`
	Message param.Field[string]                 `json:"message,required"`
	Extra   param.Field[map[string]interface{}] `json:"extra"`
}

func (r AppLogParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

type AppAgentsParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r AppAgentsParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// Agent represents an AI agent
type Agent struct {
	ID          string     `json:"id,required"`
	Name        string     `json:"name,required"`
	Description string     `json:"description"`
	Mode        AgentMode  `json:"mode"`
	Model       AgentModel `json:"model"`
	BuiltIn     bool       `json:"builtIn"`
	JSON        agentJSON  `json:"-"`
}

// AgentMode constants
type AgentMode string

const (
	AgentModePrimary  AgentMode = "primary"
	AgentModeSubagent AgentMode = "subagent"
)

// AgentModel represents the model configuration for an agent
type AgentModel struct {
	ProviderID string `json:"providerID"`
	ModelID    string `json:"modelID"`
}

type agentJSON struct {
	ID          apijson.Field
	Name        apijson.Field
	Description apijson.Field
	Mode        apijson.Field
	Model       apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Agent) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

// AppProvidersParams are parameters for the Providers method
type AppProvidersParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r AppProvidersParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// AppProvidersResponse represents the response from the providers endpoint
type AppProvidersResponse struct {
	Providers []Provider           `json:"providers,required"`
	Default   map[string]int       `json:"default"`
	JSON      appProvidersRespJSON `json:"-"`
}

type appProvidersRespJSON struct {
	Providers   apijson.Field
	Default     apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *AppProvidersResponse) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}
