import { Effect, Layer } from 'effect';
import { TTSError, TTSQuotaExceededError } from '../errors';
import {
  TTS,
  type TTSService,
  type SynthesizeResult,
  type SpeakerTurn,
  type SpeakerVoiceConfig,
} from '../service';

// Mock TTS service for testing
const createMockTTSService = (
  mockSynthesize: TTSService['synthesize'],
): TTSService => ({
  synthesize: mockSynthesize,
});

describe('TTS Service', () => {
  describe('TTS Context.Tag', () => {
    it('should have the correct tag identifier', () => {
      expect(TTS.key).toBe('@repo/tts/TTS');
    });
  });

  describe('synthesize', () => {
    it('should return audio content from multiple speakers', async () => {
      const mockAudio = Buffer.from('multi-speaker-audio-data');
      const mockResult: SynthesizeResult = {
        audioContent: mockAudio,
        audioEncoding: 'MP3',
      };

      const mockService = createMockTTSService(() =>
        Effect.succeed(mockResult),
      );
      const MockTTSLive = Layer.succeed(TTS, mockService);

      const turns: SpeakerTurn[] = [
        { speaker: 'host', text: 'Welcome to the show!' },
        { speaker: 'guest', text: 'Thanks for having me!' },
      ];

      const voiceConfigs: SpeakerVoiceConfig[] = [
        { speakerAlias: 'host', voiceId: 'Charon' },
        { speakerAlias: 'guest', voiceId: 'Kore' },
      ];

      const program = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns,
          voiceConfigs,
        });
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockTTSLive)),
      );

      expect(result.audioContent).toEqual(mockAudio);
      expect(result.audioEncoding).toBe('MP3');
    });

    it('should pass turns and voice configs correctly', async () => {
      let capturedOptions: Parameters<TTSService['synthesize']>[0] | null =
        null;

      const mockService = createMockTTSService((options) => {
        capturedOptions = options;
        return Effect.succeed({
          audioContent: Buffer.from('audio'),
          audioEncoding: 'MP3' as const,
        });
      });
      const MockTTSLive = Layer.succeed(TTS, mockService);

      const turns: SpeakerTurn[] = [
        { speaker: 'host', text: 'Hello!' },
        { speaker: 'guest', text: 'Hi there!' },
        { speaker: 'host', text: 'How are you?' },
      ];

      const voiceConfigs: SpeakerVoiceConfig[] = [
        { speakerAlias: 'host', voiceId: 'Charon' },
        { speakerAlias: 'guest', voiceId: 'Aoede' },
      ];

      const program = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns,
          voiceConfigs,
        });
      });

      await Effect.runPromise(program.pipe(Effect.provide(MockTTSLive)));

      expect(capturedOptions?.turns).toHaveLength(3);
      expect(capturedOptions?.turns[0]).toEqual({
        speaker: 'host',
        text: 'Hello!',
      });
      expect(capturedOptions?.voiceConfigs).toHaveLength(2);
      expect(capturedOptions?.voiceConfigs[0]).toEqual({
        speakerAlias: 'host',
        voiceId: 'Charon',
      });
    });

    it('should pass audio encoding option', async () => {
      let capturedOptions: Parameters<TTSService['synthesize']>[0] | null =
        null;

      const mockService = createMockTTSService((options) => {
        capturedOptions = options;
        return Effect.succeed({
          audioContent: Buffer.from('audio'),
          audioEncoding: options.audioEncoding ?? 'MP3',
        });
      });
      const MockTTSLive = Layer.succeed(TTS, mockService);

      const program = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns: [{ speaker: 'host', text: 'Test' }],
          voiceConfigs: [{ speakerAlias: 'host', voiceId: 'Charon' }],
          audioEncoding: 'OGG_OPUS',
        });
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockTTSLive)),
      );

      expect(capturedOptions?.audioEncoding).toBe('OGG_OPUS');
      expect(result.audioEncoding).toBe('OGG_OPUS');
    });

    it('should pass language code option', async () => {
      let capturedOptions: Parameters<TTSService['synthesize']>[0] | null =
        null;

      const mockService = createMockTTSService((options) => {
        capturedOptions = options;
        return Effect.succeed({
          audioContent: Buffer.from('audio'),
          audioEncoding: 'MP3' as const,
        });
      });
      const MockTTSLive = Layer.succeed(TTS, mockService);

      const program = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns: [{ speaker: 'host', text: 'Test' }],
          voiceConfigs: [{ speakerAlias: 'host', voiceId: 'Charon' }],
          languageCode: 'en-GB',
        });
      });

      await Effect.runPromise(program.pipe(Effect.provide(MockTTSLive)));

      expect(capturedOptions?.languageCode).toBe('en-GB');
    });

    it('should handle TTSError failures', async () => {
      const mockService = createMockTTSService(() =>
        Effect.fail(new TTSError({ message: 'API error occurred' })),
      );
      const MockTTSLive = Layer.succeed(TTS, mockService);

      const program = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns: [{ speaker: 'host', text: 'Test' }],
          voiceConfigs: [{ speakerAlias: 'host', voiceId: 'Charon' }],
        });
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(MockTTSLive)),
      );

      expect(result._tag).toBe('Failure');
    });

    it('should handle TTSQuotaExceededError failures', async () => {
      const mockService = createMockTTSService(() =>
        Effect.fail(new TTSQuotaExceededError({ message: 'Quota exceeded' })),
      );
      const MockTTSLive = Layer.succeed(TTS, mockService);

      const program = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns: [{ speaker: 'host', text: 'Test' }],
          voiceConfigs: [{ speakerAlias: 'host', voiceId: 'Charon' }],
        });
      });

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(MockTTSLive)),
      );

      expect(result._tag).toBe('Failure');
    });
  });
});
