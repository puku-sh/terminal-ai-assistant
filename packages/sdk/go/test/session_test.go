package test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
)

func TestSessionUpdate(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/test-id" {
			t.Errorf("expected path /session/test-id, got %s", r.URL.Path)
		}
		if r.Method != "PATCH" {
			t.Errorf("expected PATCH method, got %s", r.Method)
		}

		session := map[string]interface{}{
			"id":        "test-id",
			"title":     "Updated Title",
			"createdAt": 1234567890,
			"updatedAt": 1234567891,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(session)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	session, err := client.Session.Update(context.Background(), "test-id", pukucode.SessionUpdateParams{
		Title: pukucode.F("Updated Title"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.Title != "Updated Title" {
		t.Errorf("expected title 'Updated Title', got '%s'", session.Title)
	}
}

func TestSessionDelete(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/delete-me" {
			t.Errorf("expected path /session/delete-me, got %s", r.URL.Path)
		}
		if r.Method != "DELETE" {
			t.Errorf("expected DELETE method, got %s", r.Method)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	err := client.Session.Delete(context.Background(), "delete-me", pukucode.SessionDeleteParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSessionMessages(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/test-id/message" {
			t.Errorf("expected path /session/test-id/message, got %s", r.URL.Path)
		}
		if r.Method != "GET" {
			t.Errorf("expected GET method, got %s", r.Method)
		}

		messages := []map[string]interface{}{
			{
				"id":        "msg-1",
				"sessionID": "test-id",
				"role":      "user",
				"parts": []map[string]interface{}{
					{"type": "text", "text": "Hello"},
				},
				"createdAt": 1234567890,
			},
			{
				"id":        "msg-2",
				"sessionID": "test-id",
				"role":      "assistant",
				"parts": []map[string]interface{}{
					{"type": "text", "text": "Hi there!"},
				},
				"createdAt": 1234567891,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(messages)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	messages, err := client.Session.Messages(context.Background(), "test-id", pukucode.SessionMessagesParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(messages))
	}
	if messages[0].Role != "user" {
		t.Errorf("expected first message role 'user', got '%s'", messages[0].Role)
	}
	if messages[1].Role != "assistant" {
		t.Errorf("expected second message role 'assistant', got '%s'", messages[1].Role)
	}
}

func TestSessionPrompt(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/test-id/message" {
			t.Errorf("expected path /session/test-id/message, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}

		message := map[string]interface{}{
			"id":        "msg-new",
			"sessionID": "test-id",
			"role":      "user",
			"parts": []map[string]interface{}{
				{"type": "text", "text": "Hello"},
			},
			"createdAt": 1234567890,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(message)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	message, err := client.Session.Prompt(context.Background(), "test-id", pukucode.SessionPromptParams{
		Parts: []pukucode.MessagePart{
			{Type: "text", Text: "Hello"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if message.ID != "msg-new" {
		t.Errorf("expected message ID 'msg-new', got '%s'", message.ID)
	}
}

func TestSessionInit(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/test-id/init" {
			t.Errorf("expected path /session/test-id/init, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	err := client.Session.Init(context.Background(), "test-id", pukucode.SessionInitParams{
		MessageID:  pukucode.F("msg-1"),
		ProviderID: pukucode.F("anthropic"),
		ModelID:    pukucode.F("claude-3"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSessionAbort(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/test-id/abort" {
			t.Errorf("expected path /session/test-id/abort, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	err := client.Session.Abort(context.Background(), "test-id", pukucode.SessionAbortParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSessionCommand(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/test-id/command" {
			t.Errorf("expected path /session/test-id/command, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}

		message := map[string]interface{}{
			"id":        "msg-cmd",
			"sessionID": "test-id",
			"role":      "user",
			"createdAt": 1234567890,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(message)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	message, err := client.Session.Command(context.Background(), "test-id", pukucode.SessionCommandParams{
		Command:   pukucode.F("/help"),
		Arguments: pukucode.F(""),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if message.ID != "msg-cmd" {
		t.Errorf("expected message ID 'msg-cmd', got '%s'", message.ID)
	}
}

func TestSessionChildren(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/parent-id/children" {
			t.Errorf("expected path /session/parent-id/children, got %s", r.URL.Path)
		}

		sessions := []map[string]interface{}{
			{
				"id":        "child-1",
				"parentID":  "parent-id",
				"createdAt": 1234567890,
				"updatedAt": 1234567890,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sessions)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	children, err := client.Session.Children(context.Background(), "parent-id", pukucode.SessionChildrenParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(children) != 1 {
		t.Fatalf("expected 1 child, got %d", len(children))
	}
	if children[0].ParentID != "parent-id" {
		t.Errorf("expected parentID 'parent-id', got '%s'", children[0].ParentID)
	}
}

func TestSessionRevert(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/test-id/revert" {
			t.Errorf("expected path /session/test-id/revert, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	err := client.Session.Revert(context.Background(), "test-id", pukucode.SessionRevertParams{
		MessageID: pukucode.F("msg-1"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestQueryParameters(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		directory := r.URL.Query().Get("directory")
		if directory != "/test/dir" {
			t.Errorf("expected directory '/test/dir', got '%s'", directory)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{})
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	_, err := client.Session.List(context.Background(), pukucode.SessionListParams{
		Directory: pukucode.F("/test/dir"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
