package main

import (
	"context"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"

	tea "github.com/charmbracelet/bubbletea/v2"
	flag "github.com/spf13/pflag"
	"github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
	"github.com/pukucode/pukucode-sdk-go/packages/ssestream"
	"github.com/pukucode/pukucode-tui/internal/api"
	"github.com/pukucode/pukucode-tui/internal/app"
	"github.com/pukucode/pukucode-tui/internal/clipboard"
	"github.com/pukucode/pukucode-tui/internal/decoders"
	"github.com/pukucode/pukucode-tui/internal/tui"
	"github.com/pukucode/pukucode-tui/internal/util"
	"golang.org/x/sync/errgroup"
)

var Version = "dev"

func main() {
	version := Version
	if version != "dev" && !strings.HasPrefix(Version, "v") {
		version = "v" + Version
	}

	var model *string = flag.String("model", "", "model to begin with")
	var prompt *string = flag.String("prompt", "", "prompt to begin with")
	var agent *string = flag.String("agent", "", "agent to begin with")
	var sessionID *string = flag.String("session", "", "session ID")
	flag.Parse()

	url := os.Getenv("PUKUCODE_SERVER")
	if url == "" {
		url = os.Getenv("PUKUCODE_BASE_URL")
	}
	if url == "" {
		url = "http://localhost:1337"
	}

	stat, err := os.Stdin.Stat()
	if err != nil {
		slog.Error("Failed to stat stdin", "error", err)
		os.Exit(1)
	}

	// Check if there's data piped to stdin
	if (stat.Mode() & os.ModeCharDevice) == 0 {
		stdin, err := io.ReadAll(os.Stdin)
		if err != nil {
			slog.Error("Failed to read stdin", "error", err)
			os.Exit(1)
		}
		stdinContent := strings.TrimSpace(string(stdin))
		if stdinContent != "" {
			if prompt == nil || *prompt == "" {
				prompt = &stdinContent
			} else {
				combined := *prompt + "\n" + stdinContent
				prompt = &combined
			}
		}
	}

	// Register custom SSE decoder to handle large events (>32MB)
	ssestream.RegisterDecoder("text/event-stream", decoders.NewUnboundedDecoder)

	httpClient := pukucode.NewClient(
		option.WithBaseURL(url),
	)

	var agents []pukucode.Agent
	var path *pukucode.Path
	var project *pukucode.Project

	batch := errgroup.Group{}

	batch.Go(func() error {
		result, err := httpClient.Project.Current(context.Background(), pukucode.ProjectCurrentParams{})
		if err != nil {
			return err
		}
		project = result
		return nil
	})

	batch.Go(func() error {
		result, err := httpClient.App.Agents(context.Background(), pukucode.AppAgentsParams{})
		if err != nil {
			// Agents are optional - create default if not available
			slog.Warn("Failed to get agents, using default", "error", err)
			agents = []pukucode.Agent{
				{ID: "default", Name: "default", Description: "Default agent"},
			}
			return nil
		}
		agents = result
		return nil
	})

	batch.Go(func() error {
		result, err := httpClient.Path.Get(context.Background(), pukucode.PathGetParams{})
		if err != nil {
			return err
		}
		path = result
		return nil
	})

	err = batch.Wait()
	if err != nil {
		slog.Error("Failed to initialize", "error", err)
		panic(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	apiHandler := util.NewAPILogHandler(ctx, httpClient, "tui", slog.LevelDebug)
	logger := slog.New(apiHandler)
	slog.SetDefault(logger)

	slog.Debug("TUI launched", "url", url)

	go func() {
		err = clipboard.Init()
		if err != nil {
			slog.Error("Failed to initialize clipboard", "error", err)
		}
	}()

	// Create main context for the application
	app_, err := app.New(ctx, version, project, path, agents, httpClient, model, prompt, agent, sessionID)
	if err != nil {
		panic(err)
	}

	tuiModel := tui.NewModel(app_).(*tui.Model)
	program := tea.NewProgram(
		tuiModel,
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		slog.Info("Attempting to subscribe to event stream", "url", url+"/event")
		stream, err := httpClient.Event.Subscribe(ctx)
		if err != nil {
			slog.Error("Failed to subscribe to events", "error", err)
			return
		}
		slog.Info("Successfully subscribed to event stream")
		for stream.Next() {
			evt := stream.Current()
			slog.Debug("Received event", "type", evt.Type)

			// Debug: Log Properties to see what fields are populated
			if evt.Type == "message.updated" {
				slog.Debug("message.updated Properties",
					"Info", evt.Properties.Info,
					"Message", evt.Properties.Message,
					"SessionID", evt.Properties.SessionID,
					"MessageID", evt.Properties.MessageID)
			}

			program.Send(evt.AsUnion())
		}
		if err := stream.Err(); err != nil {
			slog.Error("Error streaming events", "error", err)
			program.Send(err)
		}
		slog.Info("Event stream ended")
	}()

	go api.Start(ctx, program, httpClient)

	// Handle signals in a separate goroutine
	go func() {
		sig := <-sigChan
		slog.Info("Received signal, shutting down gracefully", "signal", sig)
		tuiModel.Cleanup()
		program.Quit()
	}()

	// Run the TUI
	result, err := program.Run()
	if err != nil {
		slog.Error("TUI error", "error", err)
	}

	tuiModel.Cleanup()
	slog.Info("TUI exited", "result", result)
}
