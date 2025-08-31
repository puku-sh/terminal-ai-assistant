# Troubleshooting Guide for PukuCode

This guide helps resolve common issues when setting up and using PukuCode.

## API Key Issues

### "AI_APICallError: invalid x-api-key" Error

This error typically occurs when:

1. **API key is not set correctly**
   ```bash
   # Check if your API key is set
   echo $GROQ_API_KEY
   echo $ANTHROPIC_API_KEY
   echo $OPENAI_API_KEY
   ```

2. **API key format is incorrect**
   - Anthropic keys start with: `sk-ant-api03-`
   - Groq keys start with: `gsk_`
   - OpenAI keys start with: `sk-`

3. **Environment variable naming**
   ```bash
   # Correct environment variable names
   export GROQ_API_KEY=gsk_your_key_here
   export ANTHROPIC_API_KEY=sk-ant-api03-your_key_here
   export OPENAI_API_KEY=sk-your_key_here
   ```

4. **Provider configuration mismatch**
   - The system tries to use the first available provider/model combination
   - If your configured model doesn't exist, it may fallback to unexpected models

### Solution Steps

1. **Verify API Key**
   ```bash
   # Test your Groq API key directly
   curl -X POST "https://api.groq.com/openai/v1/chat/completions" \
     -H "Authorization: Bearer $GROQ_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"model":"llama-3.1-70b-versatile"}'
   ```

2. **Set Environment Variables**
   ```bash
   # Option 1: Export in terminal
   export GROQ_API_KEY=gsk_your_key_here
   
   # Option 2: Create .env file
   echo "GROQ_API_KEY=gsk_your_key_here" > .env
   ```

3. **Test with Specific Model**
   ```bash
   # Test with explicit model selection
   GROQ_API_KEY=your_key bun run src/index.ts run --model "groq/llama-3.1-70b-versatile" "test"
   ```

## Provider Detection Issues

### No Providers Found

**Symptoms:**
- "no providers found" error
- Empty provider list

**Causes:**
1. No API keys are set for any provider
2. All providers are disabled in configuration
3. Network issues preventing models.dev fetch

**Solutions:**
1. **Check Available Providers**
   ```bash
   # Enable debug logging to see provider detection
   bun run src/index.ts run --print-logs --log-level DEBUG "test"
   ```

2. **Set At Least One API Key**
   ```bash
   # Set one of these
   export GROQ_API_KEY=gsk_your_key
   export ANTHROPIC_API_KEY=sk-ant-api03-your_key
   export OPENAI_API_KEY=sk-your_key
   ```

3. **Check Configuration**
   ```bash
   # Check for disabled providers in config
   cat ~/.config/pukucode/config.json | grep disabled_providers
   ```

### Wrong Model Selection

**Symptoms:**
- App uses unexpected models (like `qwen/qwen3-32b` instead of your intended model)
- Model not found errors

**Solutions:**
1. **Specify Model Explicitly**
   ```bash
   # Always specify the exact model you want
   bun run src/index.ts run --model "groq/llama-3.1-70b-versatile" "your message"
   ```

2. **Check Available Models**
   Available Groq models in PukuCode:
   - `groq/llama-3.1-70b-versatile`
   - `groq/mixtral-8x7b-32768`  
   - `groq/gemma2-9b-it`

3. **Set Default Model in Config**
   ```json
   {
     "model": "groq/llama-3.1-70b-versatile"
   }
   ```

## Installation Issues

### Missing Dependencies

**Symptoms:**
- Module not found errors
- TypeScript compilation errors

**Solutions:**
```bash
# Reinstall all dependencies
rm -rf node_modules bun.lockb
bun install

# Install specific missing packages
bun add @ai-sdk/anthropic groq-sdk openai decimal.js turndown
```

### BunProc Installation Failures

**Symptoms:**
- Package installation timeouts
- Network-related installation errors

**Solutions:**
1. **Clear Bun Cache**
   ```bash
   rm -rf ~/.bun/install/cache
   ```

2. **Check Network Connectivity**
   ```bash
   curl -I https://registry.npmjs.org/
   ```

## Configuration Issues

### Config File Problems

**Symptoms:**
- Configuration not loading
- Default settings always used

**Check Config Locations:**
```bash
# Linux/macOS config locations
ls -la ~/.config/pukucode/
ls -la ~/.config/opencode/  # Legacy location

# Project-specific config
ls -la pukucode.json
ls -la pukucode.jsonc
```

### Legacy OpenCode References

**Symptoms:**
- References to "opencode" instead of "pukucode"
- Config loading from wrong directories

**Solution:**
1. **Update Config Paths**
   ```bash
   # If you have old opencode config, copy it
   cp ~/.config/opencode/config.json ~/.config/pukucode/config.json
   ```

2. **Check for Hardcoded Paths**
   ```bash
   # Search for any remaining "opencode" references
   grep -r "opencode" src/ --exclude-dir=node_modules
   ```

## Network Issues

### models.dev API Failures

**Symptoms:**
- "Failed to fetch models.dev" warnings in logs
- Fallback to stub model configurations

**Impact:**
- Usually not critical - app falls back to built-in model definitions
- May miss latest model updates

**Solution:**
```bash
# Test models.dev connectivity
curl -I https://models.dev/api.json
```

### Provider API Connectivity

**Test Each Provider:**
```bash
# Test Groq
curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models

# Test Anthropic  
curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages

# Test OpenAI
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

## Advanced Debugging

### Enable Full Logging

```bash
# Maximum verbosity
PUKUCODE_DEBUG=true bun run src/index.ts run --print-logs --log-level DEBUG "test"
```

### Check System State

```bash
# Check environment
env | grep -E "(GROQ|ANTHROPIC|OPENAI)"

# Check file permissions
ls -la ~/.config/pukucode/

# Check Bun installation
bun --version
which bun
```

### Manual Provider Testing

Create a simple test script to isolate provider issues:

```typescript
// test-provider.ts
import { Provider } from './src/provider/provider'

async function testProvider() {
  try {
    const providers = await Provider.list()
    console.log('Available providers:', Object.keys(providers))
    
    for (const [id, provider] of Object.entries(providers)) {
      console.log(`${id}:`, {
        source: provider.source,
        models: Object.keys(provider.info.models)
      })
    }
  } catch (e) {
    console.error('Provider test failed:', e)
  }
}

testProvider()
```

```bash
# Run the test
bun run test-provider.ts
```

## Common Error Messages

### "Error: no providers found"
- **Cause**: No API keys set for any provider
- **Fix**: Set at least one API key (GROQ_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY)

### "ProviderModelNotFoundError"  
- **Cause**: Specified model doesn't exist for the provider
- **Fix**: Use correct model names from the provider's model list

### "ProviderInitError"
- **Cause**: Provider SDK failed to initialize
- **Fix**: Check network connectivity and API key validity

### Module resolution errors
- **Cause**: Missing dependencies or Bun installation issues  
- **Fix**: Run `bun install` and ensure all peer dependencies are installed

## Getting Help

If you continue to have issues:

1. **Enable debug logging** and capture the full output
2. **Test individual components** (API keys, network connectivity, config loading)
3. **Check the logs** for specific error messages and error codes
4. **Try different providers** to isolate the issue

### Debug Command Template

```bash
# Comprehensive debug run
PUKUCODE_DEBUG=true \
GROQ_API_KEY=your_key_here \
bun run src/index.ts run \
  --print-logs \
  --log-level DEBUG \
  --model "groq/llama-3.1-70b-versatile" \
  "test message"
```

This will give you maximum visibility into what's happening during execution.