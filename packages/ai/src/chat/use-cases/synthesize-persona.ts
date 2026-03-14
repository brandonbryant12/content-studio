import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import { chatSynthesizePersonaSystemPrompt } from '../../prompt-registry/prompts/chat-synthesize-persona-system';
import { renderPrompt } from '../../prompt-registry/render';
import {
  VOICES,
  getVoiceGender,
  isValidVoiceId,
  type VoiceGender,
} from '../../tts/voices';
import { withAIUsageScope } from '../../usage/scope';
import {
  buildSynthesisPrompts,
  getMessageText,
  normalizeStringWithFallback,
} from './chat-message-utils';

const SynthesisResult = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
  personalityDescription: Schema.String,
  speakingStyle: Schema.String,
  exampleQuotes: Schema.Array(Schema.String),
  voiceId: Schema.String,
  voiceName: Schema.String,
});

const FALLBACK_QUOTE = "Let's break this down and see what actually matters.";
const FALLBACK_VOICE = 'Puck';
const FALLBACK_NAME = 'Podcast Persona';
const FEMALE_VOICE_FALLBACK = 'Leda';
const MALE_VOICE_FALLBACK = 'Charon';
const NAME_PREFIX_PATTERN =
  /^(?:(?:mr|mrs|ms|miss|mx|dr|prof|professor|sir|dame|capt|captain|coach|rev|reverend|fr|father|judge)\.?\s+)+/i;
const NAME_SUFFIX_PATTERN =
  /(?:,\s*|\s+)(?:(?:ph\.?d|m\.?d|m\.?b\.?a|esq|esquire|jr|sr|ii|iii|iv))\.?$/i;
const FEMALE_HONORIFIC_PATTERN = /^\s*(?:mrs|ms|miss|dame)\.?\s+/i;
const MALE_HONORIFIC_PATTERN = /^\s*(?:mr|sir)\.?\s+/i;
const FEMALE_GENDER_PATTERNS = [
  /\b(?:female|woman|girl|lady)\b(?:[^.\n]{0,40})\b(?:host|co[- ]?host|persona|speaker|voice)\b/i,
  /\b(?:host|co[- ]?host|persona|speaker|voice)\b(?:[^.\n]{0,40})\b(?:female|woman|girl|lady)\b/i,
  /\b(?:she\/her|she her|she\/they|she they)\b/i,
  /\b(?:mother|mom|wife|daughter|sister|aunt)\b/i,
] as const;
const MALE_GENDER_PATTERNS = [
  /\b(?:male|man|boy|gentleman)\b(?:[^.\n]{0,40})\b(?:host|co[- ]?host|persona|speaker|voice)\b/i,
  /\b(?:host|co[- ]?host|persona|speaker|voice)\b(?:[^.\n]{0,40})\b(?:male|man|boy|gentleman)\b/i,
  /\b(?:he\/him|he him|he\/they|he they)\b/i,
  /\b(?:father|dad|husband|son|brother|uncle)\b/i,
] as const;

function normalizeExampleQuotes(quotes: readonly string[]) {
  const normalized = quotes
    .map((quote) => quote.trim())
    .filter((quote) => quote.length > 0)
    .slice(0, 3);

  return normalized.length > 0 ? normalized : [FALLBACK_QUOTE];
}

function countPatternMatches(text: string, patterns: readonly RegExp[]) {
  return patterns.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0,
  );
}

function inferVoiceGenderHint(
  messages: readonly UIMessage[],
  generatedName?: string,
): VoiceGender | null {
  const userText = messages
    .filter((message) => message.role === 'user')
    .map((message) => getMessageText(message))
    .filter((text) => text.length > 0)
    .join('\n\n');

  let femaleSignals = countPatternMatches(userText, FEMALE_GENDER_PATTERNS);
  let maleSignals = countPatternMatches(userText, MALE_GENDER_PATTERNS);

  if (generatedName) {
    if (FEMALE_HONORIFIC_PATTERN.test(generatedName)) {
      femaleSignals += 2;
    }

    if (MALE_HONORIFIC_PATTERN.test(generatedName)) {
      maleSignals += 2;
    }
  }

  if (femaleSignals === 0 && maleSignals === 0) {
    return null;
  }

  if (femaleSignals === maleSignals) {
    return null;
  }

  return femaleSignals > maleSignals ? 'female' : 'male';
}

function buildVoiceGenderGuardrail(genderHint: VoiceGender | null) {
  if (genderHint === null) {
    return null;
  }

  return `Voice selection guardrail: the conversation explicitly indicates this persona should use a ${genderHint} voice. Select only from the available ${genderHint} voices, and do not choose a ${
    genderHint === 'female' ? 'male' : 'female'
  } voice.`;
}

function descriptionKeywords(description: string) {
  return description
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(
      (word) =>
        word.length > 3 &&
        word !== 'voice' &&
        word !== 'female' &&
        word !== 'male',
    );
}

function selectVoiceForGender(
  gender: VoiceGender,
  currentVoiceId: string,
): { voiceId: string; voiceName: string } {
  const fallbackVoiceId =
    gender === 'female' ? FEMALE_VOICE_FALLBACK : MALE_VOICE_FALLBACK;
  const fallbackVoice = VOICES.find((voice) => voice.id === fallbackVoiceId);

  if (!isValidVoiceId(currentVoiceId)) {
    return {
      voiceId: fallbackVoice?.id ?? fallbackVoiceId,
      voiceName: fallbackVoice?.name ?? fallbackVoiceId,
    };
  }

  const currentVoice = VOICES.find((voice) => voice.id === currentVoiceId);

  if (!currentVoice) {
    return {
      voiceId: fallbackVoice?.id ?? fallbackVoiceId,
      voiceName: fallbackVoice?.name ?? fallbackVoiceId,
    };
  }

  if (getVoiceGender(currentVoiceId) === gender) {
    return { voiceId: currentVoice.id, voiceName: currentVoice.name };
  }

  const currentKeywords = new Set(
    descriptionKeywords(currentVoice.description),
  );
  const rankedCandidates = VOICES.filter((voice) => voice.gender === gender)
    .map((voice) => ({
      voice,
      overlap: descriptionKeywords(voice.description).filter((keyword) =>
        currentKeywords.has(keyword),
      ).length,
    }))
    .sort((left, right) => right.overlap - left.overlap);

  const bestCandidate = rankedCandidates[0];
  if (bestCandidate && bestCandidate.overlap > 0) {
    return {
      voiceId: bestCandidate.voice.id,
      voiceName: bestCandidate.voice.name,
    };
  }

  return {
    voiceId: fallbackVoice?.id ?? fallbackVoiceId,
    voiceName: fallbackVoice?.name ?? fallbackVoiceId,
  };
}

function stripPersonaNameSuffixes(value: string) {
  let normalized = value;

  while (NAME_SUFFIX_PATTERN.test(normalized)) {
    normalized = normalized.replace(NAME_SUFFIX_PATTERN, '').trim();
  }

  return normalized;
}

function normalizePersonaName(value: string) {
  const cleaned = stripPersonaNameSuffixes(
    value
      .trim()
      .replace(/^["']+|["']+$/g, '')
      .replace(NAME_PREFIX_PATTERN, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );

  return normalizeStringWithFallback(cleaned, FALLBACK_NAME);
}

function normalizeSynthesisResult(
  result: {
    readonly name: string;
    readonly role: string;
    readonly personalityDescription: string;
    readonly speakingStyle: string;
    readonly exampleQuotes: readonly string[];
    readonly voiceId: string;
    readonly voiceName: string;
  },
  voiceGenderHint: VoiceGender | null,
) {
  const selectedVoice = voiceGenderHint
    ? selectVoiceForGender(
        voiceGenderHint,
        normalizeStringWithFallback(result.voiceId, FALLBACK_VOICE),
      )
    : {
        voiceId: normalizeStringWithFallback(result.voiceId, FALLBACK_VOICE),
        voiceName: normalizeStringWithFallback(
          result.voiceName,
          FALLBACK_VOICE,
        ),
      };

  return {
    name: normalizePersonaName(result.name),
    role: normalizeStringWithFallback(result.role, 'Podcast Host'),
    personalityDescription: normalizeStringWithFallback(
      result.personalityDescription,
      'Curious, credible, and engaging on mic.',
    ),
    speakingStyle: normalizeStringWithFallback(
      result.speakingStyle,
      'Conversational, clear, and quick to guide the listener.',
    ),
    exampleQuotes: normalizeExampleQuotes(result.exampleQuotes),
    voiceId: selectedVoice.voiceId,
    voiceName: selectedVoice.voiceName,
  };
}

export interface SynthesizePersonaInput {
  readonly messages: UIMessage[];
}

export const synthesizePersona = (input: SynthesizePersonaInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const voiceGenderHint = inferVoiceGenderHint(input.messages);
    const voiceGenderGuardrail = buildVoiceGenderGuardrail(voiceGenderHint);
    const generate = (prompt: string, temperature: number, maxTokens: number) =>
      llm.generate({
        system: renderPrompt(chatSynthesizePersonaSystemPrompt),
        prompt,
        schema: SynthesisResult,
        temperature,
        maxTokens,
      });

    const { primary: primaryPrompt, fallback: fallbackPrompt } =
      buildSynthesisPrompts(input.messages);
    const primaryPromptWithGuardrail = [voiceGenderGuardrail, primaryPrompt]
      .filter((part): part is string => Boolean(part))
      .join('\n\n');
    const fallbackPromptWithGuardrail = [voiceGenderGuardrail, fallbackPrompt]
      .filter((part): part is string => Boolean(part))
      .join('\n\n');

    const primaryResult = yield* generate(
      primaryPromptWithGuardrail,
      0.5,
      1024,
    ).pipe(
      // Lengthy conversations can degrade structured output reliability.
      // Retry once with a compact context window before surfacing the error.
      Effect.catchTag('LLMError', () =>
        generate(fallbackPromptWithGuardrail, 0.2, 768),
      ),
    );

    return normalizeSynthesisResult(
      primaryResult.object,
      inferVoiceGenderHint(input.messages, primaryResult.object.name),
    );
  }).pipe(
    withAIUsageScope({ operation: 'useCase.synthesizePersona' }),
    Effect.withSpan('useCase.synthesizePersona', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
