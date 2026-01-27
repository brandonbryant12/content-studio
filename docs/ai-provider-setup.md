# AI Provider Setup

Content Studio supports two Google AI backends for LLM and TTS services:

1. **Gemini API** (default) - Simple API key authentication
2. **Vertex AI** - Enterprise-grade with service account authentication

## Quick Start

### Option 1: Gemini API (Recommended for Development)

Set these environment variables:

```bash
# Use Gemini API (default)
AI_PROVIDER=gemini

# Your Gemini API key from https://aistudio.google.com/apikey
GEMINI_API_KEY=your-api-key-here
```

### Option 2: Vertex AI with Express Mode

For simple Vertex AI usage with an API key:

```bash
# Use Vertex AI
AI_PROVIDER=vertex

# Vertex AI API key
GOOGLE_VERTEX_API_KEY=your-vertex-api-key
```

### Option 3: Vertex AI with Service Account (Production)

For production deployments with service account authentication:

```bash
# Use Vertex AI
AI_PROVIDER=vertex

# Your GCP project ID
GOOGLE_VERTEX_PROJECT=my-project-id

# GCP region (e.g., us-central1, europe-west1)
GOOGLE_VERTEX_LOCATION=us-central1

# Path to your service account JSON key file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Configuration Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_PROVIDER` | No | `gemini` (default) or `vertex` |
| `GEMINI_API_KEY` | If `gemini` | Gemini API key |
| `GOOGLE_VERTEX_API_KEY` | If `vertex` express mode | Vertex AI API key |
| `GOOGLE_VERTEX_PROJECT` | If `vertex` service account | GCP project ID |
| `GOOGLE_VERTEX_LOCATION` | If `vertex` service account | GCP region |
| `GOOGLE_APPLICATION_CREDENTIALS` | If `vertex` service account | Path to service account JSON |
| `USE_MOCK_AI` | No | Set to `true` to use mock AI for development |

## Development Mode

For local development without real AI services:

```bash
USE_MOCK_AI=true
```

This uses mock services with realistic latency for testing the UI flow.

## Getting API Keys

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key and set it as `GEMINI_API_KEY`

### Vertex AI Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable the "Vertex AI API"
4. For Express Mode:
   - Go to APIs & Services > Credentials
   - Create an API key and set it as `GOOGLE_VERTEX_API_KEY`
5. For Service Account Mode:
   - Go to IAM & Admin > Service Accounts
   - Create a service account with "Vertex AI User" role
   - Create a JSON key and save it locally
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path

## Troubleshooting

### "GEMINI_API_KEY is required"

You're using the default Gemini provider but haven't set the API key:
```bash
export GEMINI_API_KEY=your-key
```

### "Vertex AI requires either GOOGLE_VERTEX_API_KEY or GOOGLE_VERTEX_PROJECT"

When `AI_PROVIDER=vertex`, you need either:
- Express mode: Set `GOOGLE_VERTEX_API_KEY`
- Service account: Set both `GOOGLE_VERTEX_PROJECT` and `GOOGLE_VERTEX_LOCATION`

### "Failed to obtain access token"

For Vertex AI service account mode, ensure:
1. `GOOGLE_APPLICATION_CREDENTIALS` points to a valid JSON key file
2. The service account has "Vertex AI User" permissions
3. The Vertex AI API is enabled in your project
