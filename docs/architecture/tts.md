# TTS Architecture

## Overview

The `@repo/tts` package provides text-to-speech functionality for generating podcast audio. It currently uses Google's Gemini API for multi-speaker synthesis.

## Package Structure

```
packages/tts/
├── src/
│   ├── index.ts           # Public exports
│   ├── service.ts         # Service interface & types
│   ├── voices.ts          # Available voices catalog
│   └── providers/
│       └── google.ts      # Gemini TTS implementation
├── package.json
└── tsconfig.json
```

## Service Interface

```typescript
interface TTSService {
  // List available voices
  listVoices(options?: ListVoicesOptions): Effect<VoiceInfo[], TTSError>;

  // Preview a single voice
  previewVoice(options: PreviewVoiceOptions): Effect<PreviewVoiceResult, TTSError>;

  // Synthesize multi-speaker audio
  synthesize(options: SynthesizeOptions): Effect<SynthesizeResult, TTSError>;
}
```

## Audio Format

### Gemini TTS Output

Gemini's multi-speaker TTS API (`generateContent` with `responseModalities: ['AUDIO']`) returns:

| Property | Value |
|----------|-------|
| Format | Raw PCM (Linear16) |
| Sample Rate | 24,000 Hz |
| Bit Depth | 16-bit |
| Channels | Mono |
| Byte Rate | 48,000 bytes/sec |

**Important:** The audio is returned as base64-encoded data in `candidates[0].content.parts[0].inlineData`.

### WAV Wrapping

The raw PCM must be wrapped with a WAV header for browser/player compatibility. The `wrapPcmAsWav()` function adds a 44-byte header:

```
Bytes 0-3:   "RIFF"
Bytes 4-7:   File size - 8
Bytes 8-11:  "WAVE"
Bytes 12-15: "fmt "
Bytes 16-19: 16 (fmt chunk size)
Bytes 20-21: 1 (PCM format)
Bytes 22-23: 1 (mono)
Bytes 24-27: 24000 (sample rate)
Bytes 28-31: 48000 (byte rate)
Bytes 32-33: 2 (block align)
Bytes 34-35: 16 (bits per sample)
Bytes 36-39: "data"
Bytes 40-43: data size
Bytes 44+:   PCM audio data
```

## Gotchas & Learnings

### Double-Wrapping Detection

Gemini's response format can vary. Sometimes the API returns already-wrapped WAV data instead of raw PCM. Always check before wrapping:

```typescript
const audioData = Buffer.from(inlineData.data, 'base64');

// Check if already WAV (starts with RIFF header)
const isAlreadyWav = audioData.slice(0, 4).toString('ascii') === 'RIFF';
const audioContent = isAlreadyWav ? audioData : wrapPcmAsWav(audioData);
```

**Symptom of double-wrapping:** QuickTime shows duration and slider moves, but no audio plays. The WAV header is valid but the audio data is corrupted.

### Debug Logging

The provider logs format info for debugging:

```typescript
console.log('[TTS] Gemini response:', {
  mimeType: inlineData.mimeType,
  dataSize: audioData.length,
  first4Bytes: audioData.slice(0, 4).toString('hex'),
  headerCheck: audioData.slice(0, 4).toString('ascii'),
});
```

Check logs if audio issues occur. Expected output for raw PCM:
- `mimeType`: varies (may be `audio/L16`, `audio/pcm`, or unspecified)
- `headerCheck`: random characters (NOT "RIFF")

Expected output for already-wrapped WAV:
- `headerCheck`: "RIFF"

### Duration Calculation

For WAV audio at 24kHz, 16-bit, mono:

```typescript
const durationSeconds = Math.round(audioContent.length / 48000);
```

This accounts for the 44-byte header being negligible for typical audio lengths.

## Multi-Speaker Configuration

Google's Gemini multi-speaker TTS requires exactly 2 voice configurations:

```typescript
const voiceConfigs: SpeakerVoiceConfig[] = [
  { speakerAlias: 'host', voiceId: 'Charon' },
  { speakerAlias: 'cohost', voiceId: 'Kore' },
];
```

The conversation text format:
```
host: Welcome to the show!
cohost: Thanks for having me!
```

## Available Voices

Voices are catalogued in `voices.ts` with gender metadata for filtering:

| Voice | Gender |
|-------|--------|
| Charon | Male |
| Kore | Female |
| Fenrir | Male |
| Aoede | Female |
| Puck | Male |
| Leda | Female |

## Error Handling

```typescript
TTSError          // General TTS failure
TTSQuotaExceededError  // Rate limit / quota exceeded (429)
```

## References

- [Gemini Speech Generation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Gemini API Reference](https://ai.google.dev/api/generate-content)
