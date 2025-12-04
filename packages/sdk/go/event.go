package pukucode

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"

	"github.com/pukucode/pukucode-sdk-go/internal/requestconfig"
	"github.com/pukucode/pukucode-sdk-go/option"
	"github.com/pukucode/pukucode-sdk-go/packages/ssestream"
)

// EventService contains methods for interacting with the event API.
type EventService struct {
	Options []option.RequestOption
}

// NewEventService generates a new service.
func NewEventService(opts ...option.RequestOption) (r *EventService) {
	r = &EventService{}
	r.Options = opts
	return
}

// Subscribe subscribes to server-sent events
func (r *EventService) Subscribe(ctx context.Context, opts ...option.RequestOption) (stream *ssestream.Stream[Event], err error) {
	opts = slices.Concat(r.Options, opts)
	opts = append(opts, option.WithHeader("Accept", "text/event-stream"))

	var res *http.Response
	path := "event"
	err = requestconfig.ExecuteNewRequest(ctx, http.MethodGet, path, nil, &res, opts...)
	if err != nil {
		return nil, err
	}

	decoder := ssestream.NewDecoder(res)
	return ssestream.NewStream[Event](decoder, nil), nil
}

// Event represents a server-sent event from PukuCode
// The server sends events in format: {"type": "...", "properties": {...}}
type Event struct {
	Type       string          `json:"type"`
	Properties EventProperties `json:"properties"`
}

// EventProperties contains the event-specific data
// Different event types have different properties
type EventProperties struct {
	// Common fields (may be empty depending on event type)
	ID           string `json:"id,omitempty"`
	SessionID    string `json:"sessionID,omitempty"`
	MessageID    string `json:"messageID,omitempty"`
	PartID       string `json:"partID,omitempty"`
	PermissionID string `json:"permissionID,omitempty"`
	Version      string `json:"version,omitempty"`

	// For session.updated, session.deleted events
	Info *Session `json:"info,omitempty"`

	// For message.updated events
	Message *EventMessage `json:"message,omitempty"`

	// For message.part.updated events
	Part *EventMessagePart `json:"part,omitempty"`

	// For session.error events
	Error *EventError `json:"error,omitempty"`

	// For file.edited, file.watcher.updated events
	File  string `json:"file,omitempty"`
	Event string `json:"event,omitempty"` // "rename" | "change"

	// For permission.updated events
	PermissionInfo *PermissionInfo `json:"permission,omitempty"`

	// For permission.replied events
	Response string `json:"response,omitempty"` // "once" | "always" | "reject"

	// Raw JSON for accessing any field not explicitly defined
	Raw json.RawMessage `json:"-"`
}

// SessionInfo contains session metadata
type SessionInfo struct {
	ID        string      `json:"id"`
	SessionID string      `json:"sessionID,omitempty"` // For message updates
	ProjectID string      `json:"projectID,omitempty"`
	Directory string      `json:"directory,omitempty"`
	ParentID  string      `json:"parentID,omitempty"`
	Title     string      `json:"title,omitempty"`
	Version   string      `json:"version,omitempty"`
	Time      *TimeInfo   `json:"time,omitempty"`
	Revert    *RevertInfo `json:"revert,omitempty"`
}

// TimeInfo contains timestamp information
type TimeInfo struct {
	Created   int64 `json:"created,omitempty"`
	Updated   int64 `json:"updated,omitempty"`
	Completed int64 `json:"completed,omitempty"`
}

// RevertInfo contains revert state information
type RevertInfo struct {
	MessageID string `json:"messageID,omitempty"`
	PartID    string `json:"partID,omitempty"`
	Snapshot  string `json:"snapshot,omitempty"`
	Diff      string `json:"diff,omitempty"`
}

// EventMessage represents a message in SSE events
type EventMessage struct {
	ID        string                `json:"id"`
	SessionID string                `json:"sessionID"`
	Role      string                `json:"role"`
	Mode      string                `json:"mode,omitempty"`
	ModelID   string                `json:"modelID,omitempty"`
	Time      MessageTime           `json:"time,omitempty"`
	Error     AssistantMessageError `json:"error,omitempty"`
	Cost      float64               `json:"cost,omitempty"`
	Tokens    AssistantMessageTokens `json:"tokens,omitempty"`
	Summary   *AssistantMessageSummary `json:"summary,omitempty"`
}

// AsUnion returns the EventMessage as a typed message based on Role field
func (r *EventMessage) AsUnion() MessageUnion {
	if r.Role == "user" {
		return UserMessage{
			ID:        r.ID,
			SessionID: r.SessionID,
			Role:      UserMessageRoleUser,
			Time:      UserMessageTime{Created: r.Time.Created},
		}
	}
	return AssistantMessage{
		ID:        r.ID,
		SessionID: r.SessionID,
		Role:      r.Role,
		Mode:      r.Mode,
		ModelID:   r.ModelID,
		Time:      r.Time,
		Error:     r.Error,
		Cost:      r.Cost,
		Tokens:    r.Tokens,
		Summary:   r.Summary,
	}
}

// EventMessagePart represents a part of a message in SSE events (text, tool, file, etc.)
// This is separate from MessagePart in session.go which is used for API requests
type EventMessagePart struct {
	ID        string `json:"id"`
	SessionID string `json:"sessionID"`
	MessageID string `json:"messageID"`
	Type      string `json:"type"` // "text", "reasoning", "tool", "file", "step-start", "step-finish", etc.

	// For text and reasoning parts
	Text      string `json:"text,omitempty"`
	Synthetic bool   `json:"synthetic,omitempty"`

	// For tool parts
	CallID string     `json:"callID,omitempty"`
	Tool   string     `json:"tool,omitempty"`
	State  *ToolState `json:"state,omitempty"`

	// For file parts
	Mime     string `json:"mime,omitempty"`
	Filename string `json:"filename,omitempty"`
	URL      string `json:"url,omitempty"`

	// For step-finish parts
	Cost   float64     `json:"cost,omitempty"`
	Tokens *TokenUsage `json:"tokens,omitempty"`

	// Time information
	Time *PartTime `json:"time,omitempty"`
}

// AsUnion returns the EventMessagePart as a typed part based on Type field
func (r *EventMessagePart) AsUnion() PartUnion {
	switch r.Type {
	case "text":
		return TextPart{
			ID:        r.ID,
			MessageID: r.MessageID,
			SessionID: r.SessionID,
			Type:      TextPartTypeText,
			Text:      r.Text,
			Synthetic: r.Synthetic,
			Time:      TextPartTime{Start: r.getTimeStart(), End: r.getTimeEnd()},
		}
	case "reasoning":
		return ReasoningPart{
			ID:        r.ID,
			MessageID: r.MessageID,
			SessionID: r.SessionID,
			Type:      r.Type,
			Text:      r.Text,
			Time:      ReasoningPartTime{Start: r.getTimeStart(), End: r.getTimeEnd()},
		}
	case "tool":
		var state ToolPartState
		if r.State != nil {
			var output, errStr *string
			if r.State.Output != "" {
				output = &r.State.Output
			}
			if r.State.Error != "" {
				errStr = &r.State.Error
			}
			state = ToolPartState{
				Status:   ToolPartStateStatus(r.State.Status),
				Input:    r.State.Input,
				Output:   output,
				Error:    errStr,
				Title:    r.State.Title,
				Metadata: r.State.Metadata,
				Time:     ToolPartStateTime{Start: r.getTimeStart(), End: r.getTimeEnd()},
			}
		}
		return ToolPart{
			ID:     r.ID,
			CallID: r.CallID,
			Type:   r.Type,
			Tool:   r.Tool,
			State:  state,
		}
	case "file":
		return FilePart{
			ID:        r.ID,
			MessageID: r.MessageID,
			SessionID: r.SessionID,
			Type:      FilePartTypeFile,
			Mime:      r.Mime,
			URL:       r.URL,
			Filename:  r.Filename,
		}
	case "step-start":
		return StepStartPart{
			ID:        r.ID,
			MessageID: r.MessageID,
			SessionID: r.SessionID,
			Type:      r.Type,
		}
	case "step-finish":
		var tokens *StepFinishTokens
		if r.Tokens != nil {
			var cache *StepFinishCache
			if r.Tokens.Cache != nil {
				cache = &StepFinishCache{
					Read:  r.Tokens.Cache.Read,
					Write: r.Tokens.Cache.Write,
				}
			}
			tokens = &StepFinishTokens{
				Input:     r.Tokens.Input,
				Output:    r.Tokens.Output,
				Reasoning: r.Tokens.Reasoning,
				Cache:     cache,
			}
		}
		return StepFinishPart{
			ID:        r.ID,
			MessageID: r.MessageID,
			SessionID: r.SessionID,
			Type:      r.Type,
			Cost:      r.Cost,
			Tokens:    tokens,
		}
	default:
		return TextPart{ID: r.ID, Type: TextPartTypeText, Text: r.Text}
	}
}

func (r *EventMessagePart) getTimeStart() int64 {
	if r.Time != nil {
		return r.Time.Start
	}
	return 0
}

func (r *EventMessagePart) getTimeEnd() int64 {
	if r.Time != nil {
		return r.Time.End
	}
	return 0
}

// ToolState represents the state of a tool execution
type ToolState struct {
	Status   string                 `json:"status"` // "pending", "running", "completed", "error"
	Input    map[string]interface{} `json:"input,omitempty"`
	Output   string                 `json:"output,omitempty"`
	Error    string                 `json:"error,omitempty"`
	Title    string                 `json:"title,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
	Time     *PartTime              `json:"time,omitempty"`
}

// PartTime contains timing information for message parts
type PartTime struct {
	Start int64 `json:"start,omitempty"`
	End   int64 `json:"end,omitempty"`
}

// TokenUsage contains token usage information
type TokenUsage struct {
	Input     int64       `json:"input"`
	Output    int64       `json:"output"`
	Reasoning int64       `json:"reasoning"`
	Cache     *CacheUsage `json:"cache,omitempty"`
}

// CacheUsage contains cache read/write counts
type CacheUsage struct {
	Read  int64 `json:"read"`
	Write int64 `json:"write"`
}

// EventError contains error information for session.error events
type EventError struct {
	Name       string `json:"name"`
	Message    string `json:"message"`
	ProviderID string `json:"providerID,omitempty"`
}

// PermissionInfo contains permission request information
type PermissionInfo struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Pattern   string                 `json:"pattern,omitempty"`
	SessionID string                 `json:"sessionID"`
	MessageID string                 `json:"messageID"`
	CallID    string                 `json:"callID,omitempty"`
	Title     string                 `json:"title"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Time      *TimeInfo              `json:"time,omitempty"`
}

// Helper methods for easy access to common fields

// GetSessionID returns the session ID from the event
// It checks both the direct sessionID field and nested info.id
func (e *Event) GetSessionID() string {
	if e.Properties.SessionID != "" {
		return e.Properties.SessionID
	}
	if e.Properties.Info != nil {
		return e.Properties.Info.ID
	}
	if e.Properties.Part != nil {
		return e.Properties.Part.SessionID
	}
	if e.Properties.PermissionInfo != nil {
		return e.Properties.PermissionInfo.SessionID
	}
	return ""
}

// GetMessageID returns the message ID from the event
func (e *Event) GetMessageID() string {
	if e.Properties.MessageID != "" {
		return e.Properties.MessageID
	}
	if e.Properties.Part != nil {
		return e.Properties.Part.MessageID
	}
	if e.Properties.PermissionInfo != nil {
		return e.Properties.PermissionInfo.MessageID
	}
	return ""
}

// GetText returns the text content if this is a text part update
func (e *Event) GetText() string {
	if e.Properties.Part != nil && e.Properties.Part.Type == "text" {
		return e.Properties.Part.Text
	}
	return ""
}

// GetPart returns the message part if this is a part update event
func (e *Event) GetPart() *EventMessagePart {
	return e.Properties.Part
}

// Event type aliases for type switching
// These allow code like: case pukucode.EventListResponseEventSessionUpdated:

// EventListResponseEventSessionUpdated is an event when a session is updated
type EventListResponseEventSessionUpdated Event

// EventListResponseEventSessionDeleted is an event when a session is deleted
type EventListResponseEventSessionDeleted Event

// EventListResponseEventSessionError is an event when a session error occurs
type EventListResponseEventSessionError Event

// EventListResponseEventMessageUpdated is an event when a message is updated
type EventListResponseEventMessageUpdated Event

// EventListResponseEventMessagePartUpdated is an event when a message part is updated
type EventListResponseEventMessagePartUpdated Event

// EventListResponseEventMessageRemoved is an event when a message is removed
type EventListResponseEventMessageRemoved Event

// EventListResponseEventMessagePartRemoved is an event when a message part is removed
type EventListResponseEventMessagePartRemoved Event

// EventListResponseEventPermissionUpdated is an event when a permission is updated
type EventListResponseEventPermissionUpdated Event

// EventListResponseEventPermissionReplied is an event when a permission is replied to
type EventListResponseEventPermissionReplied Event

// EventListResponseEventFileEdited is an event when a file is edited
type EventListResponseEventFileEdited Event

// EventListResponseEventFileWatcher is an event from the file watcher
type EventListResponseEventFileWatcher Event

// EventListResponseEventInstallationUpdated is an event when an installation is updated
type EventListResponseEventInstallationUpdated Event

// EventListResponseEventSessionCompacted is an event when a session is compacted
type EventListResponseEventSessionCompacted Event

// AsUnion returns the Event as the appropriate typed event based on the Type field
// This allows type switching in Bubble Tea message handlers
func (e *Event) AsUnion() interface{} {
	switch e.Type {
	case "session.updated":
		return EventListResponseEventSessionUpdated(*e)
	case "session.deleted":
		return EventListResponseEventSessionDeleted(*e)
	case "session.error":
		return EventListResponseEventSessionError(*e)
	case "message.updated":
		return EventListResponseEventMessageUpdated(*e)
	case "message.part.updated":
		return EventListResponseEventMessagePartUpdated(*e)
	case "message.removed":
		return EventListResponseEventMessageRemoved(*e)
	case "message.part.removed":
		return EventListResponseEventMessagePartRemoved(*e)
	case "permission.updated":
		return EventListResponseEventPermissionUpdated(*e)
	case "permission.replied":
		return EventListResponseEventPermissionReplied(*e)
	case "file.edited":
		return EventListResponseEventFileEdited(*e)
	case "file.watcher":
		return EventListResponseEventFileWatcher(*e)
	case "installation.updated":
		return EventListResponseEventInstallationUpdated(*e)
	case "session.compacted":
		return EventListResponseEventSessionCompacted(*e)
	default:
		// Return the base Event if type is unknown
		return *e
	}
}
