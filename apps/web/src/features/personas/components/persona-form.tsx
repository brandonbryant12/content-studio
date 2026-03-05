import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { useCallback, type ChangeEvent } from 'react';
import { PERSONA_FIELD_HELP } from '@/shared/lib/persona-guidance';

export interface PersonaFormValues {
  name: string;
  role: string;
  personalityDescription: string;
  speakingStyle: string;
  exampleQuotes: string[];
  voiceId: string;
  voiceName: string;
}

interface PersonaFormProps {
  values: PersonaFormValues;
  onChange: (values: PersonaFormValues) => void;
  disabled?: boolean;
}

export function PersonaForm({
  values,
  onChange,
  disabled = false,
}: PersonaFormProps) {
  const updateField = useCallback(
    <K extends keyof PersonaFormValues>(
      field: K,
      value: PersonaFormValues[K],
    ) => {
      onChange({ ...values, [field]: value });
    },
    [values, onChange],
  );

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value),
    [updateField],
  );

  const handleRoleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => updateField('role', e.target.value),
    [updateField],
  );

  const handlePersonalityChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) =>
      updateField('personalityDescription', e.target.value),
    [updateField],
  );

  const handleSpeakingStyleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) =>
      updateField('speakingStyle', e.target.value),
    [updateField],
  );

  const handleQuoteChange = useCallback(
    (index: number, value: string) => {
      const updated = [...values.exampleQuotes];
      updated[index] = value;
      updateField('exampleQuotes', updated);
    },
    [values.exampleQuotes, updateField],
  );

  const handleAddQuote = useCallback(() => {
    updateField('exampleQuotes', [...values.exampleQuotes, '']);
  }, [values.exampleQuotes, updateField]);

  const handleRemoveQuote = useCallback(
    (index: number) => {
      updateField(
        'exampleQuotes',
        values.exampleQuotes.filter((_, i) => i !== index),
      );
    },
    [values.exampleQuotes, updateField],
  );

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="persona-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <p
          id="persona-name-help"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {PERSONA_FIELD_HELP.name}
        </p>
        <Input
          id="persona-name"
          value={values.name}
          onChange={handleNameChange}
          placeholder="e.g., Dr. Sarah Chen"
          disabled={disabled}
          autoComplete="off"
          aria-describedby="persona-name-help"
        />
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label htmlFor="persona-role">Role</Label>
        <p
          id="persona-role-help"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {PERSONA_FIELD_HELP.role}
        </p>
        <Input
          id="persona-role"
          value={values.role}
          onChange={handleRoleChange}
          placeholder="e.g., Industry Expert, Storyteller, Interviewer"
          disabled={disabled}
          autoComplete="off"
          aria-describedby="persona-role-help"
        />
      </div>

      {/* Personality Description */}
      <div className="space-y-2">
        <Label htmlFor="persona-personality">Personality Description</Label>
        <p
          id="persona-personality-help"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {PERSONA_FIELD_HELP.personalityDescription}
        </p>
        <Textarea
          id="persona-personality"
          value={values.personalityDescription}
          onChange={handlePersonalityChange}
          placeholder="Describe this persona's personality traits, background, and how they approach topics..."
          disabled={disabled}
          rows={4}
          className="resize-y"
          aria-describedby="persona-personality-help"
        />
      </div>

      {/* Speaking Style */}
      <div className="space-y-2">
        <Label htmlFor="persona-speaking-style">Speaking Style</Label>
        <p
          id="persona-speaking-style-help"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {PERSONA_FIELD_HELP.speakingStyle}
        </p>
        <Textarea
          id="persona-speaking-style"
          value={values.speakingStyle}
          onChange={handleSpeakingStyleChange}
          placeholder="e.g., Casual and humorous, uses analogies, asks rhetorical questions"
          disabled={disabled}
          rows={3}
          className="resize-y"
          aria-describedby="persona-speaking-style-help"
        />
      </div>

      {/* Example Quotes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Example Quotes</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddQuote}
            disabled={disabled}
            className="text-xs h-7 px-2"
          >
            <PlusIcon className="w-3 h-3 mr-1" />
            Add Quote
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {PERSONA_FIELD_HELP.exampleQuotes}
        </p>
        <div className="space-y-2">
          {values.exampleQuotes.map((quote, index) => (
            <div key={`quote-${index}`} className="flex items-start gap-2">
              <Input
                value={quote}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleQuoteChange(index, e.target.value)
                }
                placeholder={`"Quote ${index + 1}..."`}
                disabled={disabled}
                className="flex-1"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveQuote(index)}
                disabled={disabled}
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove quote ${index + 1}`}
              >
                <Cross2Icon className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
