package util

import (
	"context"
	"fmt"
	"log/slog"
	"reflect"
	"sync"

	"github.com/pukucode/pukucode-sdk-go"
)

func sanitizeValue(val any) any {
	if val == nil {
		return nil
	}

	if err, ok := val.(error); ok {
		return err.Error()
	}

	v := reflect.ValueOf(val)
	if v.Kind() == reflect.Interface && !v.IsNil() {
		return fmt.Sprintf("%T", val)
	}

	return val
}

type APILogHandler struct {
	client  *pukucode.Client
	service string
	level   slog.Level
	attrs   []slog.Attr
	groups  []string
	mu      sync.Mutex
	queue   chan pukucode.AppLogParams
}

func NewAPILogHandler(ctx context.Context, client *pukucode.Client, service string, level slog.Level) *APILogHandler {
	result := &APILogHandler{
		client:  client,
		service: service,
		level:   level,
		attrs:   make([]slog.Attr, 0),
		groups:  make([]string, 0),
		queue:   make(chan pukucode.AppLogParams, 100_000),
	}
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case params := <-result.queue:
				err := client.App.Log(context.Background(), params)
				if err != nil {
					// Don't log to slog to avoid infinite loop
				}
			}
		}
	}()
	return result
}

func (h *APILogHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.level
}

func (h *APILogHandler) Handle(ctx context.Context, r slog.Record) error {
	var apiLevel string
	switch r.Level {
	case slog.LevelDebug:
		apiLevel = "debug"
	case slog.LevelInfo:
		apiLevel = "info"
	case slog.LevelWarn:
		apiLevel = "warn"
	case slog.LevelError:
		apiLevel = "error"
	default:
		apiLevel = "info"
	}

	extra := make(map[string]any)

	h.mu.Lock()
	for _, attr := range h.attrs {
		val := attr.Value.Any()
		extra[attr.Key] = sanitizeValue(val)
	}
	h.mu.Unlock()

	r.Attrs(func(attr slog.Attr) bool {
		val := attr.Value.Any()
		extra[attr.Key] = sanitizeValue(val)
		return true
	})

	params := pukucode.AppLogParams{
		Service: pukucode.F(h.service),
		Level:   pukucode.F(apiLevel),
		Message: pukucode.F(r.Message),
	}

	if len(extra) > 0 {
		params.Extra = pukucode.F(extra)
	}

	h.queue <- params

	return nil
}

// WithAttrs returns a new Handler whose attributes consist of
// both the receiver's attributes and the arguments.
func (h *APILogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	h.mu.Lock()
	defer h.mu.Unlock()

	newHandler := &APILogHandler{
		client:  h.client,
		service: h.service,
		level:   h.level,
		attrs:   make([]slog.Attr, len(h.attrs)+len(attrs)),
		groups:  make([]string, len(h.groups)),
		queue:   h.queue,
	}

	copy(newHandler.attrs, h.attrs)
	copy(newHandler.attrs[len(h.attrs):], attrs)
	copy(newHandler.groups, h.groups)

	return newHandler
}

// WithGroup returns a new Handler with the given group appended to
// the receiver's existing groups.
func (h *APILogHandler) WithGroup(name string) slog.Handler {
	h.mu.Lock()
	defer h.mu.Unlock()

	newHandler := &APILogHandler{
		client:  h.client,
		service: h.service,
		level:   h.level,
		attrs:   make([]slog.Attr, len(h.attrs)),
		groups:  make([]string, len(h.groups)+1),
		queue:   h.queue,
	}

	copy(newHandler.attrs, h.attrs)
	copy(newHandler.groups, h.groups)
	newHandler.groups[len(h.groups)] = name

	return newHandler
}
