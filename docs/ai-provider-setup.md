# AI Provider Setup

Content Studio uses the Google Gemini API for LLM, TTS, image generation, and deep research services.

## Quick Start

Set these environment variables:

```bash
# Your Gemini API key from https://aistudio.google.com/apikey
GEMINI_API_KEY=your-api-key-here
```

## Configuration Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes (unless mock) | Gemini API key |
| `USE_MOCK_AI` | No | Set to `true` to use mock AI for development |

## Development Mode

For local development without real AI services:

```bash
USE_MOCK_AI=true
```

This uses mock services with realistic latency for testing the UI flow.

## Getting an API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key and set it as `GEMINI_API_KEY`

## Troubleshooting

### "GEMINI_API_KEY is required"

You haven't set the API key and mock AI is disabled:
```bash
export GEMINI_API_KEY=your-key
```

Or enable mock AI for development:
```bash
export USE_MOCK_AI=true
```
