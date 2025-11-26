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

// ProjectService contains methods for interacting with the project API.
type ProjectService struct {
	Options []option.RequestOption
}

// NewProjectService generates a new service.
func NewProjectService(opts ...option.RequestOption) (r *ProjectService) {
	r = &ProjectService{}
	r.Options = opts
	return
}

// List lists all projects
func (r *ProjectService) List(ctx context.Context, query ProjectListParams, opts ...option.RequestOption) (res []Project, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "project"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Current gets the current project
func (r *ProjectService) Current(ctx context.Context, query ProjectCurrentParams, opts ...option.RequestOption) (res *Project, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "project/current"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

type ProjectListParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r ProjectListParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type ProjectCurrentParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r ProjectCurrentParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// Project represents a project
type Project struct {
	ID       string      `json:"id,required"`
	Worktree string      `json:"worktree,required"`
	VCS      string      `json:"vcs"`
	Time     ProjectTime `json:"time,required"`
	JSON     projectJSON `json:"-"`
}

type ProjectTime struct {
	Created     int64           `json:"created,required"`
	Initialized int64           `json:"initialized"`
	JSON        projectTimeJSON `json:"-"`
}

type projectTimeJSON struct {
	Created     apijson.Field
	Initialized apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *ProjectTime) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

type projectJSON struct {
	ID          apijson.Field
	Worktree    apijson.Field
	VCS         apijson.Field
	Time        apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Project) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r projectJSON) RawJSON() string {
	return r.raw
}
