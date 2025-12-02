package pukucode

import (
	"context"
	"net/http"
	"os"
	"slices"

	"github.com/pukucode/pukucode-sdk-go/internal/requestconfig"
	"github.com/pukucode/pukucode-sdk-go/option"
)

// Client creates a struct with services and top level methods that help with
// interacting with the pukucode API.
type Client struct {
	Options []option.RequestOption
	Event   *EventService
	Path    *PathService
	App     *AppService
	File    *FileService
	Config  *ConfigService
	Command *CommandService
	Project *ProjectService
	Session *SessionService
	Tui     *TuiService
	Auth    *AuthService
	Tool    *ToolService
	Agent   *AgentService
	Find    *FindService
}

// DefaultClientOptions read from the environment (PUKUCODE_BASE_URL).
func DefaultClientOptions() []option.RequestOption {
	defaults := []option.RequestOption{option.WithEnvironmentProduction()}
	if o, ok := os.LookupEnv("PUKUCODE_BASE_URL"); ok {
		defaults = append(defaults, option.WithBaseURL(o))
	}
	return defaults
}

// NewClient generates a new client with the default option read from the
// environment (PUKUCODE_BASE_URL).
func NewClient(opts ...option.RequestOption) (r *Client) {
	opts = append(DefaultClientOptions(), opts...)

	r = &Client{Options: opts}

	r.Event = NewEventService(opts...)
	r.Path = NewPathService(opts...)
	r.App = NewAppService(opts...)
	r.File = NewFileService(opts...)
	r.Config = NewConfigService(opts...)
	r.Command = NewCommandService(opts...)
	r.Project = NewProjectService(opts...)
	r.Session = NewSessionService(opts...)
	r.Tui = NewTuiService(opts...)
	r.Auth = NewAuthService(opts...)
	r.Tool = NewToolService(opts...)
	r.Agent = NewAgentService(opts...)
	r.Find = NewFindService(opts...)

	return
}

// Execute makes a request with the given context, method, URL, request params,
// response, and request options.
func (r *Client) Execute(ctx context.Context, method string, path string, params interface{}, res interface{}, opts ...option.RequestOption) error {
	opts = slices.Concat(r.Options, opts)
	return requestconfig.ExecuteNewRequest(ctx, method, path, params, res, opts...)
}

// Get makes a GET request
func (r *Client) Get(ctx context.Context, path string, params interface{}, res interface{}, opts ...option.RequestOption) error {
	return r.Execute(ctx, http.MethodGet, path, params, res, opts...)
}

// Post makes a POST request
func (r *Client) Post(ctx context.Context, path string, params interface{}, res interface{}, opts ...option.RequestOption) error {
	return r.Execute(ctx, http.MethodPost, path, params, res, opts...)
}

// Put makes a PUT request
func (r *Client) Put(ctx context.Context, path string, params interface{}, res interface{}, opts ...option.RequestOption) error {
	return r.Execute(ctx, http.MethodPut, path, params, res, opts...)
}

// Patch makes a PATCH request
func (r *Client) Patch(ctx context.Context, path string, params interface{}, res interface{}, opts ...option.RequestOption) error {
	return r.Execute(ctx, http.MethodPatch, path, params, res, opts...)
}

// Delete makes a DELETE request
func (r *Client) Delete(ctx context.Context, path string, params interface{}, res interface{}, opts ...option.RequestOption) error {
	return r.Execute(ctx, http.MethodDelete, path, params, res, opts...)
}
