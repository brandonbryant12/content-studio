import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';

const SynthesisResult = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
  personalityDescription: Schema.String,
  speakingStyle: Schema.String,
  exampleQuotes: Schema.Array(Schema.String),
  voiceId: Schema.String,
  voiceName: Schema.String,
});

const SYSTEM_PROMPT = `You are a persona synthesizer for Content Studio.

Given a conversation between a user and a persona creation assistant, synthesize the discussion into a structured persona definition:
1. A name for the persona (can be a real-sounding name or a character name)
2. A brief role description (e.g., "Tech Industry Analyst", "Science Communicator")
3. A personality description capturing their traits and background
4. A speaking style description (tone, patterns, verbal habits)
5. 2-3 example quotes that capture how this persona would speak
6. A voice that best matches the persona's character from the available voices

## Available Voices
Female:
- Aoede — Melodic and engaging
- Kore — Youthful and energetic
- Leda — Friendly and approachable
- Zephyr — Light and airy

Male:
- Charon — Clear and professional
- Fenrir — Bold and dynamic
- Puck — Lively and engaging
- Orus — Friendly and conversational

Set voiceId and voiceName to the voice name (e.g. voiceId: "Puck", voiceName: "Puck").
Pick the voice that best matches the persona's personality, energy level, and speaking style.

Focus on creating a vivid, distinctive character based on the conversation.`;

function formatMessages(messages: UIMessage[]): string {
  return messages
    .map((m) => {
      const text = m.parts
        .filter(
          (p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text',
        )
        .map((p) => p.text)
        .join('');
      return `${m.role === 'user' ? 'User' : 'Assistant'}: ${text}`;
    })
    .join('\n\n');
}

export interface SynthesizePersonaInput {
  readonly messages: UIMessage[];
}

export const synthesizePersona = (input: SynthesizePersonaInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;

    const result = yield* llm.generate({
      system: SYSTEM_PROMPT,
      prompt: formatMessages(input.messages),
      schema: SynthesisResult,
      temperature: 0.3,
      maxTokens: 1024,
    });

    return result.object;
  }).pipe(
    Effect.withSpan('useCase.synthesizePersona', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
