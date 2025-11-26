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

// FileService contains methods for interacting with the file API.
type FileService struct {
	Options []option.RequestOption
}

// NewFileService generates a new service.
func NewFileService(opts ...option.RequestOption) (r *FileService) {
	r = &FileService{}
	r.Options = opts
	return
}

// List lists files in a directory
func (r *FileService) List(ctx context.Context, query FileListParams, opts ...option.RequestOption) (res []FileInfo, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "file"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Read reads file content
func (r *FileService) Read(ctx context.Context, query FileReadParams, opts ...option.RequestOption) (res *string, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "file/content"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Status gets file status
func (r *FileService) Status(ctx context.Context, query FileStatusParams, opts ...option.RequestOption) (res *FileStatus, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "file/status"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

type FileListParams struct {
	Path      param.Field[string] `query:"path,required"`
	Directory param.Field[string] `query:"directory"`
}

func (r FileListParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type FileReadParams struct {
	Path      param.Field[string] `query:"path,required"`
	Directory param.Field[string] `query:"directory"`
}

func (r FileReadParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type FileStatusParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r FileStatusParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// FileInfo represents file information
type FileInfo struct {
	Name  string       `json:"name,required"`
	Path  string       `json:"path,required"`
	IsDir bool         `json:"isDir,required"`
	Size  int64        `json:"size"`
	JSON  fileInfoJSON `json:"-"`
}

type fileInfoJSON struct {
	Name        apijson.Field
	Path        apijson.Field
	IsDir       apijson.Field
	Size        apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *FileInfo) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

// FileStatus represents file status
type FileStatus struct {
	Modified []string       `json:"modified"`
	Added    []string       `json:"added"`
	Deleted  []string       `json:"deleted"`
	JSON     fileStatusJSON `json:"-"`
}

type fileStatusJSON struct {
	Modified    apijson.Field
	Added       apijson.Field
	Deleted     apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *FileStatus) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}
