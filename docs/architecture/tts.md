# TTS Architecture

Text-to-speech for generating audio from scripts. Uses Google's Gemini multi-speaker synthesis.

## Concept

```
Script (speaker-tagged text)
        │
        ▼
  TTS Provider (Gemini)
        │
        ▼
   Audio (WAV file)
```

## Service Interface

| Method | Purpose |
|--------|---------|
| listVoices | Available voice catalog with metadata |
| previewVoice | Generate sample for voice selection |
| synthesize | Full multi-speaker audio generation |

## Multi-Speaker Format

Scripts use speaker aliases that map to voices:

```
host: Welcome to the show!
cohost: Thanks for having me!
```

Voice assignment happens at synthesis time—same script can use different voice combinations.

## Provider Model

Provider interface allows swapping TTS backends:

- Google Gemini (current)
- Future: ElevenLabs, Azure, local models

Each provider handles raw audio format conversion internally.

## Audio Pipeline

Gemini returns raw PCM. Must be wrapped as WAV for playback:

1. Receive base64 PCM data
2. Check if already WAV format (varies by API response)
3. Wrap with WAV header if needed
4. Store resulting audio file

**Format**: 24kHz, 16-bit, mono.

## Debugging Audio Issues

If audio doesn't play:
1. Check if WAV was double-wrapped (header corruption)
2. Verify sample rate matches expected
3. Check provider logs for format info

**Symptom of double-wrap**: Player shows duration but no sound.

## Error Types

| Error | Meaning |
|-------|---------|
| TTSError | General synthesis failure |
| TTSQuotaExceeded | API rate limit hit |

## Voices

Six voices available, mix of male/female. Voice selection exposed in UI for podcast generation.
