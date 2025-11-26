package test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
)

// closureTransport is a test transport that calls a function
type closureTransport struct {
	fn func(*http.Request) (*http.Response, error)
}

func (t *closureTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	return t.fn(req)
}

func TestClientCreation(t *testing.T) {
	client := pukucode.NewClient()
	if client == nil {
		t.Fatal("expected client to be created")
	}
	if client.Session == nil {
		t.Fatal("expected session service to be initialized")
	}
	if client.Event == nil {
		t.Fatal("expected event service to be initialized")
	}
}

func TestClientWithBaseURL(t *testing.T) {
	baseURL := "http://custom.api:8080"
	client := pukucode.NewClient(option.WithBaseURL(baseURL))
	if client == nil {
		t.Fatal("expected client to be created")
	}
}

func TestUserAgentHeader(t *testing.T) {
	var userAgent string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userAgent = r.Header.Get("User-Agent")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]map[string]interface{}{})
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	_, err := client.Session.List(context.Background(), pukucode.SessionListParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if userAgent == "" {
		t.Error("expected User-Agent header to be set")
	}
}

func TestSessionList(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session" {
			t.Errorf("expected path /session, got %s", r.URL.Path)
		}
		if r.Method != "GET" {
			t.Errorf("expected GET method, got %s", r.Method)
		}

		sessions := []map[string]interface{}{
			{
				"id":        "session-1",
				"title":     "Test Session",
				"createdAt": 1234567890,
				"updatedAt": 1234567890,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sessions)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	sessions, err := client.Session.List(context.Background(), pukucode.SessionListParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
	if sessions[0].ID != "session-1" {
		t.Errorf("expected session ID 'session-1', got '%s'", sessions[0].ID)
	}
}

func TestSessionCreate(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session" {
			t.Errorf("expected path /session, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}

		// Check request body
		body, _ := io.ReadAll(r.Body)
		var params map[string]interface{}
		json.Unmarshal(body, &params)

		if params["title"] != "New Session" {
			t.Errorf("expected title 'New Session', got '%v'", params["title"])
		}

		session := map[string]interface{}{
			"id":        "session-new",
			"title":     "New Session",
			"createdAt": 1234567890,
			"updatedAt": 1234567890,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(session)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	session, err := client.Session.New(context.Background(), pukucode.SessionNewParams{
		Title: pukucode.F("New Session"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.ID != "session-new" {
		t.Errorf("expected session ID 'session-new', got '%s'", session.ID)
	}
}

func TestSessionGet(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/session/test-id" {
			t.Errorf("expected path /session/test-id, got %s", r.URL.Path)
		}

		session := map[string]interface{}{
			"id":        "test-id",
			"title":     "Test Session",
			"createdAt": 1234567890,
			"updatedAt": 1234567890,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(session)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	session, err := client.Session.Get(context.Background(), "test-id", pukucode.SessionGetParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.ID != "test-id" {
		t.Errorf("expected session ID 'test-id', got '%s'", session.ID)
	}
}

func TestProjectList(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/project" {
			t.Errorf("expected path /project, got %s", r.URL.Path)
		}

		projects := []map[string]interface{}{
			{
				"id":       "project-1",
				"worktree": "/path/to/project",
				"time": map[string]interface{}{
					"created": 1234567890,
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(projects)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	projects, err := client.Project.List(context.Background(), pukucode.ProjectListParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(projects) != 1 {
		t.Fatalf("expected 1 project, got %d", len(projects))
	}
	if projects[0].ID != "project-1" {
		t.Errorf("expected project ID 'project-1', got '%s'", projects[0].ID)
	}
}

func TestConfigProviders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/config/providers" {
			t.Errorf("expected path /config/providers, got %s", r.URL.Path)
		}

		providers := []map[string]interface{}{
			{
				"id":   "anthropic",
				"name": "Anthropic",
				"models": []map[string]interface{}{
					{"id": "claude-3", "name": "Claude 3"},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(providers)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	providers, err := client.Config.Providers(context.Background(), pukucode.ConfigProvidersParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(providers) != 1 {
		t.Fatalf("expected 1 provider, got %d", len(providers))
	}
	if providers[0].ID != "anthropic" {
		t.Errorf("expected provider ID 'anthropic', got '%s'", providers[0].ID)
	}
}

func TestFileList(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/file" {
			t.Errorf("expected path /file, got %s", r.URL.Path)
		}

		// Check query param
		if r.URL.Query().Get("path") != "/test/path" {
			t.Errorf("expected path query param '/test/path', got '%s'", r.URL.Query().Get("path"))
		}

		files := []map[string]interface{}{
			{
				"name":  "file1.txt",
				"path":  "/test/path/file1.txt",
				"isDir": false,
				"size":  1024,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(files)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	files, err := client.File.List(context.Background(), pukucode.FileListParams{
		Path: pukucode.F("/test/path"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(files) != 1 {
		t.Fatalf("expected 1 file, got %d", len(files))
	}
	if files[0].Name != "file1.txt" {
		t.Errorf("expected file name 'file1.txt', got '%s'", files[0].Name)
	}
}

func TestAppLog(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/log" {
			t.Errorf("expected path /log, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}

		body, _ := io.ReadAll(r.Body)
		var params map[string]interface{}
		json.Unmarshal(body, &params)

		if params["service"] != "test-service" {
			t.Errorf("expected service 'test-service', got '%v'", params["service"])
		}
		if params["level"] != "info" {
			t.Errorf("expected level 'info', got '%v'", params["level"])
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	err := client.App.Log(context.Background(), pukucode.AppLogParams{
		Service: pukucode.F("test-service"),
		Level:   pukucode.F("info"),
		Message: pukucode.F("Test message"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestTuiShowToast(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/tui/show-toast" {
			t.Errorf("expected path /tui/show-toast, got %s", r.URL.Path)
		}
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}

		body, _ := io.ReadAll(r.Body)
		var params map[string]interface{}
		json.Unmarshal(body, &params)

		if params["message"] != "Hello" {
			t.Errorf("expected message 'Hello', got '%v'", params["message"])
		}
		if params["variant"] != "success" {
			t.Errorf("expected variant 'success', got '%v'", params["variant"])
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	err := client.Tui.ShowToast(context.Background(), pukucode.TuiShowToastParams{
		Message: pukucode.F("Hello"),
		Variant: pukucode.F("success"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestAuthSet(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/anthropic" {
			t.Errorf("expected path /auth/anthropic, got %s", r.URL.Path)
		}
		if r.Method != "PUT" {
			t.Errorf("expected PUT method, got %s", r.Method)
		}

		body, _ := io.ReadAll(r.Body)
		var params map[string]interface{}
		json.Unmarshal(body, &params)

		if params["type"] != "api" {
			t.Errorf("expected type 'api', got '%v'", params["type"])
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	err := client.Auth.Set(context.Background(), "anthropic", pukucode.NewAPIKeyParams("sk-test-key"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCommandList(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/command" {
			t.Errorf("expected path /command, got %s", r.URL.Path)
		}

		commands := []map[string]interface{}{
			{
				"name":        "help",
				"description": "Show help",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(commands)
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	commands, err := client.Command.List(context.Background(), pukucode.CommandListParams{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(commands) != 1 {
		t.Fatalf("expected 1 command, got %d", len(commands))
	}
	if commands[0].Name != "help" {
		t.Errorf("expected command name 'help', got '%s'", commands[0].Name)
	}
}

func TestErrorHandling(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Bad request",
		})
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	_, err := client.Session.List(context.Background(), pukucode.SessionListParams{})
	if err == nil {
		t.Fatal("expected error for 400 response")
	}
}

func TestContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate slow response
		select {
		case <-r.Context().Done():
			return
		}
	}))
	defer server.Close()

	client := pukucode.NewClient(option.WithBaseURL(server.URL))
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	_, err := client.Session.List(ctx, pukucode.SessionListParams{})
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}

func TestFieldHelpers(t *testing.T) {
	// Test F helper
	strField := pukucode.F("test")
	if !strField.Present {
		t.Error("expected Present to be true for F helper")
	}

	// Test String helper
	strField2 := pukucode.String("test")
	if strField2.Value != "test" {
		t.Error("expected value to be 'test'")
	}

	// Test Int helper
	intField := pukucode.Int(42)
	if intField.Value != 42 {
		t.Error("expected value to be 42")
	}

	// Test Bool helper
	boolField := pukucode.Bool(true)
	if !boolField.Value {
		t.Error("expected value to be true")
	}

	// Test Null helper
	nullField := pukucode.Null[string]()
	if !nullField.Null {
		t.Error("expected Null to be true")
	}
}
