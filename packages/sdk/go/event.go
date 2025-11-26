package pukucode

import (
	"context"
	"net/http"
	"slices"

	"github.com/pukucode/pukucode-sdk-go/internal/apijson"
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

// Event represents a server-sent event
type Event struct {
	Type      string      `json:"type,required"`
	SessionID string      `json:"sessionID"`
	MessageID string      `json:"messageID"`
	Data      interface{} `json:"data"`
	JSON      eventJSON   `json:"-"`
}

type eventJSON struct {
	Type        apijson.Field
	SessionID   apijson.Field
	MessageID   apijson.Field
	Data        apijson.Field
	raw         string
	ExtraFields map[string]apijson.Field
}

func (r *Event) UnmarshalJSON(data []byte) (err error) {
	return apijson.UnmarshalRoot(data, r)
}

func (r eventJSON) RawJSON() string {
	return r.raw
}
