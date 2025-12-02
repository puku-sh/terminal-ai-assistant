package pukucode

import (
	"context"
	"net/http"
	"net/url"
	"slices"

	"github.com/pukucode/pukucode-sdk-go/internal/apiquery"
	"github.com/pukucode/pukucode-sdk-go/internal/param"
	"github.com/pukucode/pukucode-sdk-go/internal/requestconfig"
	"github.com/pukucode/pukucode-sdk-go/option"
)

// AgentService contains methods for interacting with the agent API.
type AgentService struct {
	Options []option.RequestOption
}

// NewAgentService generates a new service.
func NewAgentService(opts ...option.RequestOption) (r *AgentService) {
	r = &AgentService{}
	r.Options = opts
	return
}

// List lists all available agents
func (r *AgentService) List(ctx context.Context, query AgentListParams, opts ...option.RequestOption) (res []Agent, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "agent"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

type AgentListParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r AgentListParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}
