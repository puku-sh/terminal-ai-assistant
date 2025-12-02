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

// SessionService contains methods for interacting with the session API.
type SessionService struct {
	Options []option.RequestOption
}

// NewSessionService generates a new service.
func NewSessionService(opts ...option.RequestOption) (r *SessionService) {
	r = &SessionService{}
	r.Options = opts
	return
}

// New creates a new session
func (r *SessionService) New(ctx context.Context, body SessionNewParams, opts ...option.RequestOption) (res *Session, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, &res, opts...)
	return
}

// List lists all sessions
func (r *SessionService) List(ctx context.Context, query SessionListParams, opts ...option.RequestOption) (res *[]Session, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Get retrieves a session by ID
func (r *SessionService) Get(ctx context.Context, id string, query SessionGetParams, opts ...option.RequestOption) (res *Session, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id)
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Delete deletes a session
func (r *SessionService) Delete(ctx context.Context, id string, query SessionDeleteParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id)
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodDelete, path, query, nil, opts...)
	return
}

// Update updates a session
func (r *SessionService) Update(ctx context.Context, id string, body SessionUpdateParams, opts ...option.RequestOption) (res *Session, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id)
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPatch, path, body, &res, opts...)
	return
}

// Children gets child sessions
func (r *SessionService) Children(ctx context.Context, id string, query SessionChildrenParams, opts ...option.RequestOption) (res []Session, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/children"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Init initializes a session
func (r *SessionService) Init(ctx context.Context, id string, body SessionInitParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/init"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, nil, opts...)
	return
}

// Abort aborts a running session
func (r *SessionService) Abort(ctx context.Context, id string, query SessionAbortParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/abort"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, query, nil, opts...)
	return
}

// Messages gets all messages in a session
func (r *SessionService) Messages(ctx context.Context, id string, query SessionMessagesParams, opts ...option.RequestOption) (res *[]SessionMessagesResponse, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/message"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// SessionMessagesResponse represents a message response with union types
type SessionMessagesResponse struct {
	Info  SessionMessagesResponseInfo `json:"info"`
	Parts []SessionMessagesResponsePart `json:"parts"`
}

// SessionMessagesResponseInfo is a wrapper for message info
type SessionMessagesResponseInfo struct {
	raw interface{}
}

func (r SessionMessagesResponseInfo) AsUnion() MessageUnion {
	if um, ok := r.raw.(MessageUnion); ok {
		return um
	}
	return nil
}

func (r *SessionMessagesResponseInfo) UnmarshalJSON(data []byte) error {
	// Try to unmarshal as AssistantMessage first
	var am AssistantMessage
	if err := apijson.UnmarshalRoot(data, &am); err == nil && am.Role == "assistant" {
		r.raw = am
		return nil
	}
	// Otherwise try UserMessage
	var um UserMessage
	if err := apijson.UnmarshalRoot(data, &um); err == nil {
		r.raw = um
		return nil
	}
	return nil
}

// SessionMessagesResponsePart is a wrapper for message parts
type SessionMessagesResponsePart struct {
	raw interface{}
}

func (r SessionMessagesResponsePart) AsUnion() PartUnion {
	if pu, ok := r.raw.(PartUnion); ok {
		return pu
	}
	return nil
}

func (r *SessionMessagesResponsePart) UnmarshalJSON(data []byte) error {
	// Parse the type field to determine which type to use
	var typeCheck struct {
		Type string `json:"type"`
	}
	if err := apijson.UnmarshalRoot(data, &typeCheck); err != nil {
		return err
	}

	switch typeCheck.Type {
	case "text":
		var tp TextPart
		if err := apijson.UnmarshalRoot(data, &tp); err == nil {
			r.raw = tp
		}
	case "tool":
		var tp ToolPart
		if err := apijson.UnmarshalRoot(data, &tp); err == nil {
			r.raw = tp
		}
	case "file":
		var fp FilePart
		if err := apijson.UnmarshalRoot(data, &fp); err == nil {
			r.raw = fp
		}
	case "reasoning":
		var rp ReasoningPart
		if err := apijson.UnmarshalRoot(data, &rp); err == nil {
			r.raw = rp
		}
	case "step":
		var sp StepPart
		if err := apijson.UnmarshalRoot(data, &sp); err == nil {
			r.raw = sp
		}
	}
	return nil
}

// Prompt sends a message to a session
func (r *SessionService) Prompt(ctx context.Context, id string, body SessionPromptParams, opts ...option.RequestOption) (res *Message, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/message"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, &res, opts...)
	return
}

// Message gets a specific message
func (r *SessionService) Message(ctx context.Context, sessionID string, messageID string, query SessionMessageParams, opts ...option.RequestOption) (res *Message, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(sessionID) + "/message/" + url.PathEscape(messageID)
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
}

// Command executes a command in a session
func (r *SessionService) Command(ctx context.Context, id string, body SessionCommandParams, opts ...option.RequestOption) (res *Message, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/command"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, &res, opts...)
	return
}

// Shell executes a shell command in a session
func (r *SessionService) Shell(ctx context.Context, id string, body SessionShellParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/shell"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, nil, opts...)
	return
}

// Revert reverts to a specific message
func (r *SessionService) Revert(ctx context.Context, id string, body SessionRevertParams, opts ...option.RequestOption) (res *Session, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/revert"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, &res, opts...)
	return
}

// Unrevert undoes a revert
func (r *SessionService) Unrevert(ctx context.Context, id string, query SessionUnrevertParams, opts ...option.RequestOption) (res *Session, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/unrevert"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, query, &res, opts...)
	return
}

// Summarize compacts/summarizes a session
func (r *SessionService) Summarize(ctx context.Context, id string, body SessionSummarizeParams, opts ...option.RequestOption) (res *Session, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/summarize"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, &res, opts...)
	return
}

// Permissions responds to a permission request
func (r *SessionService) Permissions(ctx context.Context, sessionID string, permissionID string, body SessionPermissionRespondParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(sessionID) + "/permission/" + url.PathEscape(permissionID)
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, nil, opts...)
	return
}

// Share shares a session
func (r *SessionService) Share(ctx context.Context, id string, body SessionShareParams, opts ...option.RequestOption) (res *SessionShareResponse, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/share"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, &res, opts...)
	return
}

// Unshare removes sharing from a session
func (r *SessionService) Unshare(ctx context.Context, id string, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/unshare"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, nil, nil, opts...)
	return
}

// SessionShareParams represents parameters for sharing a session
type SessionShareParams struct{}

func (r SessionShareParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

// SessionShareResponse represents the response from sharing a session
type SessionShareResponse struct {
	URL string `json:"url"`
}

// SessionPermissionRespondParams represents parameters for responding to a permission
type SessionPermissionRespondParams struct {
	Response param.Field[SessionPermissionRespondParamsResponse] `json:"response,required"`
}

func (r SessionPermissionRespondParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

// Session parameters

type SessionNewParams struct {
	ParentID param.Field[string] `json:"parentID"`
	Title    param.Field[string] `json:"title"`
	Model    param.Field[string] `json:"model"`
	Agent    param.Field[string] `json:"agent"`
}

func (r SessionNewParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

type SessionListParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r SessionListParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type SessionGetParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r SessionGetParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type SessionDeleteParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r SessionDeleteParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type SessionUpdateParams struct {
	Title param.Field[string] `json:"title"`
}

func (r SessionUpdateParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

type SessionChildrenParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r SessionChildrenParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type SessionInitParams struct {
	MessageID  param.Field[string] `json:"messageID,required"`
	ProviderID param.Field[string] `json:"providerID"`
	ModelID    param.Field[string] `json:"modelID"`
}

func (r SessionInitParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

type SessionAbortParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r SessionAbortParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type SessionMessagesParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r SessionMessagesParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type SessionPromptParams struct {
	Parts     param.Field[[]SessionPromptParamsPartUnion] `json:"parts,required"`
	Model     param.Field[SessionPromptParamsModel]       `json:"model"`
	Agent     param.Field[string]                         `json:"agent"`
	MessageID param.Field[string]                         `json:"messageID"`
}

func (r SessionPromptParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

// SessionPromptParamsModel contains model information for prompts
type SessionPromptParamsModel struct {
	ProviderID param.Field[string] `json:"providerID"`
	ModelID    param.Field[string] `json:"modelID"`
}

func (r SessionPromptParamsModel) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

// SessionPromptParamsPartUnion represents a message part in a prompt
type SessionPromptParamsPartUnion struct {
	Type     string `json:"type,required"`
	Text     string `json:"text,omitempty"`
	Mime     string `json:"mime,omitempty"`
	URL      string `json:"url,omitempty"`
	Filename string `json:"filename,omitempty"`
}

// SessionSummarizeParams are parameters for the Summarize method
type SessionSummarizeParams struct {
	ProviderID param.Field[string] `json:"providerID"`
	ModelID    param.Field[string] `json:"modelID"`
}

func (r SessionSummarizeParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

type SessionMessageParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r SessionMessageParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

type SessionCommandParams struct {
	Command   param.Field[string] `json:"command,required"`
	Arguments param.Field[string] `json:"arguments,required"`
	MessageID param.Field[string] `json:"messageID"`
	Agent     param.Field[string] `json:"agent"`
	Model     param.Field[string] `json:"model"`
}

func (r SessionCommandParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

type SessionShellParams struct {
	Command param.Field[string] `json:"command,required"`
	Agent   param.Field[string] `json:"agent,required"`
}

func (r SessionShellParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

type SessionRevertParams struct {
	MessageID param.Field[string] `json:"messageID,required"`
	PartID    param.Field[string] `json:"partID"`
}

func (r SessionRevertParams) MarshalJSON() (data []byte, err error) {
	return apijson.MarshalRoot(r)
}

type SessionUnrevertParams struct {
	Directory param.Field[string] `query:"directory"`
}

func (r SessionUnrevertParams) URLQuery() (v url.Values) {
	return apiquery.MarshalWithSettings(r, apiquery.QuerySettings{
		ArrayFormat:  apiquery.ArrayQueryFormatComma,
		NestedFormat: apiquery.NestedQueryFormatBrackets,
	})
}

// Session represents a chat session
type Session struct {
	ID        string         `json:"id,required"`
	Title     string         `json:"title"`
	ParentID  string         `json:"parentID"`
	CreatedAt int64          `json:"createdAt,required"`
	UpdatedAt int64          `json:"updatedAt,required"`
	Time      SessionTime    `json:"time"`
	Share     *SessionShare  `json:"share"`
	Revert    *SessionRevert `json:"revert"`
	JSON      sessionJSON    `json:"-"`
}

// SessionShare represents sharing information for a session
type SessionShare struct {
	URL string `json:"url"`
}

// SessionRevert represents revert information
type SessionRevert struct {
	MessageID string `json:"messageID"`
	PartID    string `json:"partID"`
	Snapshot  string `json:"snapshot"`
	Diff      string `json:"diff"`
}

// SessionTime represents timing information for a session
type SessionTime struct {
	Compacting int64 `json:"compacting"`
	Created    int64 `json:"created"`
	Updated    int64 `json:"updated"`
}

type sessionJSON struct {
	ID          apijson.Field
	Title       apijson.Field
	ParentID    apijson.Field
	CreatedAt   apijson.Field
	UpdatedAt   apijson.Field
	Time        apijson.Field
	Share       apijson.Field
	Revert      apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Session) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r sessionJSON) RawJSON() string {
	return r.raw
}

// Message represents a message in a session
type Message struct {
	ID        string        `json:"id,required"`
	SessionID string        `json:"sessionID,required"`
	Role      string        `json:"role,required"`
	Parts     []MessagePart `json:"parts"`
	CreatedAt int64         `json:"createdAt,required"`
	JSON      messageJSON   `json:"-"`
}

type messageJSON struct {
	ID          apijson.Field
	SessionID   apijson.Field
	Role        apijson.Field
	Parts       apijson.Field
	CreatedAt   apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Message) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r messageJSON) RawJSON() string {
	return r.raw
}

// MessagePart represents a part of a message
type MessagePart struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type,required"`
	Text     string                 `json:"text"`
	Mime     string                 `json:"mime"`
	URL      string                 `json:"url"`
	Filename string                 `json:"filename"`
	CallID   string                 `json:"callID"`
	Tool     string                 `json:"tool"`
	State    *MessagePartToolState  `json:"state"`
}

// MessagePartToolState represents tool state for a message part
type MessagePartToolState struct {
	Status   string                 `json:"status"`
	Input    map[string]interface{} `json:"input"`
	Output   *string                `json:"output"`
	Error    *string                `json:"error"`
	Title    string                 `json:"title"`
	Metadata map[string]interface{} `json:"metadata"`
}

func (r *MessagePart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

// AsUnion returns the MessagePart as a typed part based on Type field
func (r MessagePart) AsUnion() interface{} {
	switch r.Type {
	case "text":
		return TextPart{ID: r.ID, Type: TextPartType(r.Type), Text: r.Text}
	case "file":
		return FilePart{ID: r.ID, Type: FilePartType(r.Type), Mime: r.Mime, URL: r.URL, Filename: r.Filename}
	case "tool":
		var state ToolPartState
		if r.State != nil {
			state = ToolPartState{
				Status:   ToolPartStateStatus(r.State.Status),
				Input:    r.State.Input,
				Output:   r.State.Output,
				Error:    r.State.Error,
				Title:    r.State.Title,
				Metadata: r.State.Metadata,
			}
		}
		return ToolPart{ID: r.ID, CallID: r.CallID, Type: r.Type, Tool: r.Tool, State: state}
	case "reasoning":
		return ReasoningPart{ID: r.ID, Type: r.Type, Text: r.Text}
	default:
		return r
	}
}
