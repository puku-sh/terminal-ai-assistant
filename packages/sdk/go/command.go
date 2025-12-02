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

// CommandService contains methods for interacting with the command API.
type CommandService struct {
	Options []option.RequestOption
}

// NewCommandService generates a new service.
func NewCommandService(opts ...option.RequestOption) (r *CommandService) {
	r = &CommandService{}
	r.Options = opts
	return
}

// List lists all available commands
func (r *CommandService) List(ctx context.Context, query CommandListParams, opts ...option.RequestOption) (res *[]Command, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "command"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

type CommandListParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r CommandListParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// Command represents a slash command
type Command struct {
	Name        string      `json:"name,required"`
	Description string      `json:"description"`
	JSON        commandJSON `json:"-"`
}

type commandJSON struct {
	Name        apijson.Field
	Description apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Command) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}
