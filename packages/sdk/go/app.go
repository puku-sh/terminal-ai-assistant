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
	ID          string    `json:"id,required"`
	Name        string    `json:"name,required"`
	Description string    `json:"description"`
	JSON        agentJSON `json:"-"`
}

type agentJSON struct {
	ID          apijson.Field
	Name        apijson.Field
	Description apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Agent) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}
