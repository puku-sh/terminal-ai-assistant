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

// PathService contains methods for interacting with the path API.
type PathService struct {
	Options []option.RequestOption
}

// NewPathService generates a new service.
func NewPathService(opts ...option.RequestOption) (r *PathService) {
	r = &PathService{}
	r.Options = opts
	return
}

// Get the current path
func (r *PathService) Get(ctx context.Context, query PathGetParams, opts ...option.RequestOption) (res *string, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "path"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

type PathGetParams struct {
	Directory param.Field[string] `query:"directory"`
}

// URLQuery serializes [PathGetParams]'s query parameters as `url.Values`.
func (r PathGetParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// Path represents the path response
type Path struct {
	Config    string   `json:"config,required"`
	Directory string   `json:"directory,required"`
	State     string   `json:"state,required"`
	Worktree  string   `json:"worktree,required"`
	JSON      pathJSON `json:"-"`
}

type pathJSON struct {
	Config      apijson.Field
	Directory   apijson.Field
	State       apijson.Field
	Worktree    apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Path) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r pathJSON) RawJSON() string {
	return r.raw
}
