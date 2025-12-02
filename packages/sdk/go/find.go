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

// FindService contains methods for finding files and symbols.
type FindService struct {
	Options []option.RequestOption
}

// NewFindService generates a new service.
func NewFindService(opts ...option.RequestOption) (r *FindService) {
	r = &FindService{}
	r.Options = opts
	return
}

// Files finds files matching a query
func (r *FindService) Files(ctx context.Context, query FindFilesParams, opts ...option.RequestOption) (res *[]string, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "find/files"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Symbols finds symbols matching a query
func (r *FindService) Symbols(ctx context.Context, query FindSymbolsParams, opts ...option.RequestOption) (res []FindSymbolResult, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "find/symbols"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

type FindFilesParams struct {
	Query     param.Field[string] `query:"query"`
	Directory param.Field[string] `query:"directory"`
}

func (r FindFilesParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type FindSymbolsParams struct {
	Query     param.Field[string] `query:"query"`
	Directory param.Field[string] `query:"directory"`
}

func (r FindSymbolsParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// FindFileResult represents a file search result
type FindFileResult struct {
	Path string             `json:"path,required"`
	JSON findFileResultJSON `json:"-"`
}

type findFileResultJSON struct {
	Path        apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *FindFileResult) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

// FindSymbolResult represents a symbol search result
type FindSymbolResult struct {
	Name      string               `json:"name,required"`
	Kind      int64                `json:"kind"`
	Container string               `json:"container"`
	Location  SymbolLocation       `json:"location"`
	JSON      findSymbolResultJSON `json:"-"`
}

type SymbolLocation struct {
	Uri   string      `json:"uri"`
	Range SymbolRange `json:"range"`
}

type SymbolRange struct {
	Start SymbolRangePosition `json:"start"`
	End   SymbolRangePosition `json:"end"`
}

type SymbolRangePosition struct {
	Line      int64 `json:"line"`
	Character int64 `json:"character"`
}

type findSymbolResultJSON struct {
	Name        apijson.Field
	Kind        apijson.Field
	Container   apijson.Field
	Location    apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *FindSymbolResult) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}
