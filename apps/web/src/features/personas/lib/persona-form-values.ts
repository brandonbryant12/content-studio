import type { PersonaFormValues } from '../components/persona-form';
import type { RouterOutput } from '@repo/api/client';

type Persona = RouterOutput['personas']['get'];

export const EMPTY_PERSONA_FORM_VALUES: PersonaFormValues = {
  name: '',
  role: '',
  personalityDescription: '',
  speakingStyle: '',
  exampleQuotes: [],
  voiceId: '',
  voiceName: '',
};

const haveSameQuotes = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((quote, index) => quote === right[index]);

export const toFormText = (value: string | null) => value ?? '';

export const toOptionalText = (value: string) =>
  value === '' ? undefined : value;

export const toOptionalQuotes = (quotes: string[]) => {
  const filtered = quotes.filter((quote) => quote.trim() !== '');
  return filtered.length > 0 ? filtered : undefined;
};

export function getPersonaFormValues(persona: Persona): PersonaFormValues {
  return {
    name: persona.name,
    role: toFormText(persona.role),
    personalityDescription: toFormText(persona.personalityDescription),
    speakingStyle: toFormText(persona.speakingStyle),
    exampleQuotes:
      persona.exampleQuotes.length > 0 ? [...persona.exampleQuotes] : [],
    voiceId: toFormText(persona.voiceId),
    voiceName: toFormText(persona.voiceName),
  };
}

export function hasPersonaFormChanges(
  values: PersonaFormValues,
  persona: Persona,
): boolean {
  const initialValues = getPersonaFormValues(persona);

  if (values.name !== initialValues.name) return true;
  if (values.role !== initialValues.role) return true;
  if (values.personalityDescription !== initialValues.personalityDescription)
    return true;
  if (values.speakingStyle !== initialValues.speakingStyle) return true;
  if (values.voiceId !== initialValues.voiceId) return true;
  if (values.voiceName !== initialValues.voiceName) return true;

  return !haveSameQuotes(values.exampleQuotes, initialValues.exampleQuotes);
}

export function hasPersonaDraftChanges(values: PersonaFormValues): boolean {
  return (
    values.name !== EMPTY_PERSONA_FORM_VALUES.name ||
    values.role !== EMPTY_PERSONA_FORM_VALUES.role ||
    values.personalityDescription !==
      EMPTY_PERSONA_FORM_VALUES.personalityDescription ||
    values.speakingStyle !== EMPTY_PERSONA_FORM_VALUES.speakingStyle ||
    values.voiceId !== EMPTY_PERSONA_FORM_VALUES.voiceId ||
    values.voiceName !== EMPTY_PERSONA_FORM_VALUES.voiceName ||
    !haveSameQuotes(
      values.exampleQuotes,
      EMPTY_PERSONA_FORM_VALUES.exampleQuotes,
    )
  );
}
