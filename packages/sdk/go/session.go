package pukucode

import (
	"context"
	"encoding/json"
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
func (r *SessionService) List(ctx context.Context, query SessionListParams, opts ...option.RequestOption) (res []Session, err error) {
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
func (r *SessionService) Messages(ctx context.Context, id string, query SessionMessagesParams, opts ...option.RequestOption) (res []Message, err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/message"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, query, &res, opts...)
	return
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
func (r *SessionService) Revert(ctx context.Context, id string, body SessionRevertParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/revert"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, body, nil, opts...)
	return
}

// Unrevert undoes a revert
func (r *SessionService) Unrevert(ctx context.Context, id string, query SessionUnrevertParams, opts ...option.RequestOption) (err error) {
	opts = slices.Concat(r.Options, opts)
	path := "session/" + url.PathEscape(id) + "/unrevert"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodPost, path, query, nil, opts...)
	return
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
	Parts []MessagePart `json:"parts,required"`
}

func (r SessionPromptParams) MarshalJSON() (data []byte, err error) {
	type Alias SessionPromptParams
	return json.Marshal((Alias)(r))
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
	ID        string      `json:"id,required"`
	Title     string      `json:"title"`
	ParentID  string      `json:"parentID"`
	CreatedAt int64       `json:"createdAt,required"`
	UpdatedAt int64       `json:"updatedAt,required"`
	JSON      sessionJSON `json:"-"`
}

type sessionJSON struct {
	ID          apijson.Field
	Title       apijson.Field
	ParentID    apijson.Field
	CreatedAt   apijson.Field
	UpdatedAt   apijson.Field
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
	Type     string `json:"type,required"`
	Text     string `json:"text"`
	Mime     string `json:"mime"`
	URL      string `json:"url"`
	Filename string `json:"filename"`
}

func (r *MessagePart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}
