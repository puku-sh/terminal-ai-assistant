# Debug Logging Guide

PukuCode now supports configurable log levels to help with debugging and monitoring.

## Log Levels

- **DEBUG** - Detailed information for debugging (includes request/response details, headers, etc.)
- **INFO** - General informational messages (default)
- **WARN** - Warning messages
- **ERROR** - Error messages only

## How to Enable DEBUG Logging

### Option 1: Environment Variable (Recommended)

Set the `LOG_LEVEL` environment variable before running any command:

**Windows (CMD):**
```cmd
set LOG_LEVEL=DEBUG
bun src/index.ts server -p 1337
```

**Windows (PowerShell):**
```powershell
$env:LOG_LEVEL="DEBUG"
bun src/index.ts server -p 1337
```

**Linux/Mac:**
```bash
LOG_LEVEL=DEBUG bun src/index.ts server -p 1337
```

### Option 2: Command Line Flag

Use the `--log-level` or `-l` flag when starting the server:

```bash
bun src/index.ts server -p 1337 --log-level DEBUG
```

## What DEBUG Logs Show

When DEBUG level is enabled, you'll see:

1. **Server Initialization:**
   - Port and hostname configuration
   - Server listening status

2. **HTTP Requests:**
   - Request method and path (INFO level)
   - Request query parameters (DEBUG level)
   - Request headers (DEBUG level)

3. **HTTP Responses:**
   - Response duration (INFO level)
   - Response status code and status text (DEBUG level)

## Testing Debug Logs

Run the included test script to verify debug logging:

```bash
# First, start the server with DEBUG logging
LOG_LEVEL=DEBUG bun src/index.ts server -p 1337

# In another terminal, run the test script
bun test-debug-logs.ts
```

You should see detailed DEBUG messages in the server terminal showing:
- Server initialization details
- Request headers and query parameters
- Response status codes

## Example Output

**INFO Level (default):**
```
INFO  2025-12-06T10:30:15 +0ms service=server request method=GET path=/models
INFO  2025-12-06T10:30:15 +15ms service=server response duration=15
```

**DEBUG Level:**
```
DEBUG 2025-12-06T10:30:15 +0ms service=server Initializing server port=1337 hostname=localhost
DEBUG 2025-12-06T10:30:15 +5ms service=server Server listening url=http://localhost:1337 hostname=localhost port=1337
INFO  2025-12-06T10:30:20 +100ms service=server request method=GET path=/models
DEBUG 2025-12-06T10:30:20 +2ms service=server request details method=GET path=/models query={} headers={"host":"localhost:1337","user-agent":"curl/8.0.0",...}
INFO  2025-12-06T10:30:20 +15ms service=server response duration=15
DEBUG 2025-12-06T10:30:20 +1ms service=server response details duration=15 status=200 statusText=OK
```

## Combining with Other Flags

You can combine the log level flag with other server options:

```bash
bun src/index.ts server -p 1337 -h 0.0.0.0 --log-level DEBUG --open
```

## Troubleshooting

If you don't see DEBUG logs:

1. Verify the environment variable is set: `echo $LOG_LEVEL` (Linux/Mac) or `echo %LOG_LEVEL%` (Windows CMD)
2. Make sure you're using the correct syntax for your shell
3. Check that you're running from the correct directory (`packages/pukucode/`)
4. Ensure no other log configuration is overriding the level
