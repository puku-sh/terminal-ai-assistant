package pukucode

import (
	"github.com/pukucode/pukucode-sdk-go/internal/apijson"
)

// MessageUnion is an interface for message types
type MessageUnion interface {
	implementsMessageUnion()
}

// UserMessage represents a user message
type UserMessage struct {
	ID        string          `json:"id,required"`
	SessionID string          `json:"sessionID,required"`
	Role      UserMessageRole `json:"role,required"`
	Time      UserMessageTime `json:"time"`
	JSON      userMessageJSON `json:"-"`
}

// UserMessageRole is the role type for user messages
type UserMessageRole string

const (
	UserMessageRoleUser UserMessageRole = "user"
)

// UserMessageTime represents timing information for a user message
type UserMessageTime struct {
	Created int64 `json:"created"`
}

type userMessageJSON struct {
	ID          apijson.Field
	SessionID   apijson.Field
	Role        apijson.Field
	Time        apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *UserMessage) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r UserMessage) implementsMessageUnion() {}

// AssistantMessage represents an assistant message
type AssistantMessage struct {
	ID        string                    `json:"id,required"`
	SessionID string                    `json:"sessionID,required"`
	Role      string                    `json:"role,required"`
	Mode      string                    `json:"mode"`
	ModelID   string                    `json:"modelID"`
	Time      MessageTime               `json:"time"`
	Error     AssistantMessageError     `json:"error"`
	Cost      float64                   `json:"cost"`
	Tokens    AssistantMessageTokens    `json:"tokens"`
	Summary   *AssistantMessageSummary  `json:"summary"`
	JSON      assistantMessageJSON      `json:"-"`
}

// AssistantMessageTokens represents token usage for a message
type AssistantMessageTokens struct {
	Input     int64                       `json:"input"`
	Output    int64                       `json:"output"`
	Reasoning int64                       `json:"reasoning"`
	Cache     *AssistantMessageTokenCache `json:"cache"`
}

// AssistantMessageTokenCache represents cache token usage
type AssistantMessageTokenCache struct {
	Read  int64 `json:"read"`
	Write int64 `json:"write"`
}

// AssistantMessageSummary represents a message summary
type AssistantMessageSummary struct {
	Title string `json:"title"`
	Text  string `json:"text"`
}

type assistantMessageJSON struct {
	ID          apijson.Field
	SessionID   apijson.Field
	Role        apijson.Field
	Time        apijson.Field
	Error       apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *AssistantMessage) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r AssistantMessage) implementsMessageUnion() {}

// AssistantMessageError represents an error in an assistant message
type AssistantMessageError struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

// AsUnion returns the error as a typed error based on Type field
func (e AssistantMessageError) AsUnion() interface{} {
	if e.Type == "" {
		return nil
	}
	switch e.Type {
	case "output_length":
		return AssistantMessageErrorMessageOutputLengthError{Type: e.Type, Data: e.Data}
	case "api":
		return AssistantMessageErrorAPIError{Type: e.Type, Data: ErrorData{Message: getStringFromMap(e.Data, "message")}}
	case "provider_auth":
		return ProviderAuthError{Type: e.Type, Data: ErrorData{Message: getStringFromMap(e.Data, "message")}}
	case "aborted":
		return MessageAbortedError{Type: e.Type}
	default:
		return UnknownError{Type: e.Type, Data: ErrorData{Message: getStringFromMap(e.Data, "message")}}
	}
}

func getStringFromMap(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// AssistantMessageErrorMessageOutputLengthError represents an output length error
type AssistantMessageErrorMessageOutputLengthError struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

// AssistantMessageErrorAPIError represents an API error
type AssistantMessageErrorAPIError struct {
	Type string    `json:"type"`
	Data ErrorData `json:"data"`
}

// ProviderAuthError represents a provider authentication error
type ProviderAuthError struct {
	Type string    `json:"type"`
	Data ErrorData `json:"data"`
}

// MessageAbortedError represents a message abort error
type MessageAbortedError struct {
	Type string `json:"type"`
}

// UnknownError represents an unknown error type
type UnknownError struct {
	Type string    `json:"type"`
	Data ErrorData `json:"data"`
}

// ErrorData contains error message data
type ErrorData struct {
	Message string `json:"message"`
}

// MessageTime represents timing information for a message
type MessageTime struct {
	Created   int64 `json:"created"`
	Completed int64 `json:"completed"`
}

// PartUnion is an interface for message part types
type PartUnion interface {
	implementsPartUnion()
}

// TextPart represents a text part of a message
type TextPart struct {
	ID        string        `json:"id"`
	MessageID string        `json:"messageID"`
	SessionID string        `json:"sessionID"`
	Type      TextPartType  `json:"type,required"`
	Text      string        `json:"text"`
	Time      TextPartTime  `json:"time"`
	Synthetic bool          `json:"synthetic"`
	JSON      textPartJSON  `json:"-"`
}

type TextPartType string

const (
	TextPartTypeText TextPartType = "text"
)

type TextPartTime struct {
	Start int64 `json:"start"`
	End   int64 `json:"end"`
}

type textPartJSON struct {
	ID          apijson.Field
	MessageID   apijson.Field
	SessionID   apijson.Field
	Type        apijson.Field
	Text        apijson.Field
	Time        apijson.Field
	Synthetic   apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *TextPart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r TextPart) implementsPartUnion() {}

// ReasoningPart represents a reasoning/thinking part
type ReasoningPart struct {
	ID        string              `json:"id"`
	MessageID string              `json:"messageID"`
	SessionID string              `json:"sessionID"`
	Type      string              `json:"type,required"`
	Text      string              `json:"text"`
	Reasoning string              `json:"reasoning"`
	Time      ReasoningPartTime   `json:"time"`
	JSON      reasoningPartJSON   `json:"-"`
}

// ReasoningPartTime represents timing for a reasoning part
type ReasoningPartTime struct {
	Start int64 `json:"start"`
	End   int64 `json:"end"`
}

type reasoningPartJSON struct {
	Type        apijson.Field
	Text        apijson.Field
	Reasoning   apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *ReasoningPart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r ReasoningPart) implementsPartUnion() {}

// ToolPart represents a tool call part
type ToolPart struct {
	Type   string        `json:"type,required"`
	ID     string        `json:"id"`
	CallID string        `json:"callID"`
	Tool   string        `json:"tool"`
	State  ToolPartState `json:"state"`
	JSON   toolPartJSON  `json:"-"`
}

type toolPartJSON struct {
	Type        apijson.Field
	ID          apijson.Field
	Tool        apijson.Field
	State       apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *ToolPart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r ToolPart) implementsPartUnion() {}

// ToolPartState represents the state of a tool call
type ToolPartState struct {
	Status   ToolPartStateStatus `json:"status"`
	Input    interface{}         `json:"input"`
	Output   *string             `json:"output"`
	Error    *string             `json:"error"`
	Title    string              `json:"title"`
	Time     ToolPartStateTime   `json:"time"`
	Metadata interface{}         `json:"metadata"`
}

// ToolPartStateTime represents timing for a tool call
type ToolPartStateTime struct {
	Start int64 `json:"start"`
	End   int64 `json:"end"`
}

// ToolPartStateStatus represents tool status
type ToolPartStateStatus string

const (
	ToolPartStateStatusPending   ToolPartStateStatus = "pending"
	ToolPartStateStatusRunning   ToolPartStateStatus = "running"
	ToolPartStateStatusCompleted ToolPartStateStatus = "completed"
	ToolPartStateStatusError     ToolPartStateStatus = "error"
)

// FilePart represents a file part
type FilePart struct {
	ID        string         `json:"id"`
	MessageID string         `json:"messageID"`
	SessionID string         `json:"sessionID"`
	Type      FilePartType   `json:"type,required"`
	Mime      string         `json:"mime"`
	URL       string         `json:"url"`
	Filename  string         `json:"filename"`
	Source    FilePartSource `json:"source"`
	JSON      filePartJSON   `json:"-"`
}

type FilePartType string

const (
	FilePartTypeFile FilePartType = "file"
)

type FilePartSource struct {
	Type  FilePartSourceType `json:"type"`
	Path  string             `json:"path"`
	Text  FilePartSourceText `json:"text"`
	Name  string             `json:"name"`
	Kind  int64              `json:"kind"`
	Range interface{}        `json:"range"`
}

type FilePartSourceType string

const (
	FilePartSourceTypeFile   FilePartSourceType = "file"
	FilePartSourceTypeSymbol FilePartSourceType = "symbol"
)

type FilePartSourceText struct {
	Start int64  `json:"start"`
	End   int64  `json:"end"`
	Value string `json:"value"`
}

type filePartJSON struct {
	ID          apijson.Field
	MessageID   apijson.Field
	SessionID   apijson.Field
	Type        apijson.Field
	Mime        apijson.Field
	URL         apijson.Field
	Filename    apijson.Field
	Source      apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *FilePart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r FilePart) implementsPartUnion() {}

// SymbolSourceRange represents a symbol range
type SymbolSourceRange struct {
	Start SymbolSourceRangeStart `json:"start"`
	End   SymbolSourceRangeEnd   `json:"end"`
}

type SymbolSourceRangeStart struct {
	Line      float64 `json:"line"`
	Character float64 `json:"character"`
}

type SymbolSourceRangeEnd struct {
	Line      float64 `json:"line"`
	Character float64 `json:"character"`
}

// AgentPart represents an agent mention part
type AgentPart struct {
	ID        string          `json:"id"`
	MessageID string          `json:"messageID"`
	SessionID string          `json:"sessionID"`
	Type      string          `json:"type,required"`
	Name      string          `json:"name"`
	Source    AgentPartSource `json:"source"`
	JSON      agentPartJSON   `json:"-"`
}

type AgentPartSource struct {
	Value string `json:"value"`
	Start int64  `json:"start"`
	End   int64  `json:"end"`
}

type agentPartJSON struct {
	ID          apijson.Field
	MessageID   apijson.Field
	SessionID   apijson.Field
	Type        apijson.Field
	Name        apijson.Field
	Source      apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *AgentPart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r AgentPart) implementsPartUnion() {}

// StepPart represents a step in a multi-step process
type StepPart struct {
	Type  string       `json:"type,required"`
	Step  int          `json:"step"`
	Title string       `json:"title"`
	JSON  stepPartJSON `json:"-"`
}

type stepPartJSON struct {
	Type        apijson.Field
	Step        apijson.Field
	Title       apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *StepPart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r StepPart) implementsPartUnion() {}

// Permission represents a permission request
type Permission struct {
	ID         string                 `json:"id,required"`
	SessionID  string                 `json:"sessionID,required"`
	MessageID  string                 `json:"messageID,required"`
	PartID     string                 `json:"partID,required"`
	CallID     string                 `json:"callID"`
	Type       string                 `json:"type"`
	Title      string                 `json:"title"`
	Metadata   map[string]interface{} `json:"metadata"`
	Created    int64                  `json:"created"`
	JSON       permissionJSON         `json:"-"`
}

type permissionJSON struct {
	ID          apijson.Field
	SessionID   apijson.Field
	MessageID   apijson.Field
	PartID      apijson.Field
	Title       apijson.Field
	Metadata    apijson.Field
	Created     apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Permission) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

// SessionPermissionRespondParamsResponse represents a permission response
type SessionPermissionRespondParamsResponse string

const (
	SessionPermissionRespondParamsResponseAllow   SessionPermissionRespondParamsResponse = "allow"
	SessionPermissionRespondParamsResponseDeny    SessionPermissionRespondParamsResponse = "deny"
	SessionPermissionRespondParamsResponseIgnore  SessionPermissionRespondParamsResponse = "ignore"
	SessionPermissionRespondParamsResponseOnce    SessionPermissionRespondParamsResponse = "once"
	SessionPermissionRespondParamsResponseAlways  SessionPermissionRespondParamsResponse = "always"
	SessionPermissionRespondParamsResponseReject  SessionPermissionRespondParamsResponse = "reject"
)

// StepStartPart represents a step start in a multi-step process
type StepStartPart struct {
	ID        string           `json:"id"`
	MessageID string           `json:"messageID"`
	SessionID string           `json:"sessionID"`
	Type      string           `json:"type,required"`
	Step      int              `json:"step"`
	Title     string           `json:"title"`
	JSON      stepStartPartJSON `json:"-"`
}

type stepStartPartJSON struct {
	ID          apijson.Field
	MessageID   apijson.Field
	SessionID   apijson.Field
	Type        apijson.Field
	Step        apijson.Field
	Title       apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *StepStartPart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r StepStartPart) implementsPartUnion() {}

// StepFinishPart represents a step finish in a multi-step process
type StepFinishPart struct {
	ID        string            `json:"id"`
	MessageID string            `json:"messageID"`
	SessionID string            `json:"sessionID"`
	Type      string            `json:"type,required"`
	Step      int               `json:"step"`
	Title     string            `json:"title"`
	Cost      float64           `json:"cost"`
	Tokens    *StepFinishTokens `json:"tokens"`
	JSON      stepFinishPartJSON `json:"-"`
}

type StepFinishTokens struct {
	Input     int64             `json:"input"`
	Output    int64             `json:"output"`
	Reasoning int64             `json:"reasoning"`
	Cache     *StepFinishCache  `json:"cache"`
}

type StepFinishCache struct {
	Read  int64 `json:"read"`
	Write int64 `json:"write"`
}

type stepFinishPartJSON struct {
	ID          apijson.Field
	MessageID   apijson.Field
	SessionID   apijson.Field
	Type        apijson.Field
	Step        apijson.Field
	Title       apijson.Field
	Cost        apijson.Field
	Tokens      apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *StepFinishPart) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r StepFinishPart) implementsPartUnion() {}

// Symbol represents a code symbol (class, function, etc.)
// Uses SymbolLocation, SymbolRange, SymbolRangePosition from find.go
type Symbol struct {
	Name      string         `json:"name,required"`
	Kind      int64          `json:"kind"`
	Container string         `json:"container"`
	Location  SymbolLocation `json:"location"`
	JSON      symbolJSON     `json:"-"`
}

type symbolJSON struct {
	Name        apijson.Field
	Kind        apijson.Field
	Container   apijson.Field
	Location    apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Symbol) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

