# Forms

This document defines TanStack Form patterns for Content Studio.

## Overview

Forms use TanStack Form with Effect Schema validation. Key principles:

1. **Schema-based validation** - Use Effect Schema for type-safe validation
2. **Field-level feedback** - Show errors per field, not just on submit
3. **Container/Presenter split** - Container handles submission, presenter handles UI
4. **Mutation integration** - Connect forms to TanStack Query mutations

## Basic Form Pattern

```typescript
// features/podcasts/components/create-podcast-form.tsx

import { useForm } from '@tanstack/react-form';
import { Schema } from 'effect';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { FormFieldInfo } from '@/shared/components/form-field-info';

// ============================================================================
// Validation Schema
// ============================================================================

const CreatePodcastSchema = Schema.standardSchemaV1(
  Schema.Struct({
    title: Schema.String.pipe(
      Schema.minLength(1, { message: () => 'Title is required' }),
      Schema.maxLength(200, { message: () => 'Title must be under 200 characters' }),
    ),
    format: Schema.Literal('conversation', 'voiceover'),
    targetDurationMinutes: Schema.Number.pipe(
      Schema.between(1, 60, { message: () => 'Duration must be 1-60 minutes' }),
    ),
  }),
);

type CreatePodcastValues = Schema.Schema.Type<
  typeof CreatePodcastSchema['~standard']['types']['input']
>;

// ============================================================================
// Props
// ============================================================================

interface CreatePodcastFormProps {
  onSubmit: (values: CreatePodcastValues) => Promise<void>;
  isSubmitting: boolean;
  defaultValues?: Partial<CreatePodcastValues>;
}

// ============================================================================
// Component
// ============================================================================

export function CreatePodcastForm({
  onSubmit,
  isSubmitting,
  defaultValues,
}: CreatePodcastFormProps) {
  const form = useForm({
    defaultValues: {
      title: defaultValues?.title ?? '',
      format: defaultValues?.format ?? 'conversation',
      targetDurationMinutes: defaultValues?.targetDurationMinutes ?? 5,
    },
    validators: {
      onChange: CreatePodcastSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      {/* Title Field */}
      <div>
        <form.Field
          name="title"
          children={(field) => (
            <>
              <Label htmlFor={field.name}>Title</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="My Podcast"
              />
              <FormFieldInfo field={field} />
            </>
          )}
        />
      </div>

      {/* Format Field */}
      <div>
        <form.Field
          name="format"
          children={(field) => (
            <>
              <Label>Format</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  type="button"
                  variant={field.state.value === 'conversation' ? 'default' : 'outline'}
                  onClick={() => field.handleChange('conversation')}
                >
                  Conversation
                </Button>
                <Button
                  type="button"
                  variant={field.state.value === 'voiceover' ? 'default' : 'outline'}
                  onClick={() => field.handleChange('voiceover')}
                >
                  Voice Over
                </Button>
              </div>
              <FormFieldInfo field={field} />
            </>
          )}
        />
      </div>

      {/* Duration Field */}
      <div>
        <form.Field
          name="targetDurationMinutes"
          children={(field) => (
            <>
              <Label htmlFor={field.name}>Target Duration (minutes)</Label>
              <Input
                id={field.name}
                type="number"
                min={1}
                max={60}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
              <FormFieldInfo field={field} />
            </>
          )}
        />
      </div>

      {/* Submit Button */}
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Podcast'}
          </Button>
        )}
      />
    </form>
  );
}
```

## FormFieldInfo Component

Display field errors consistently:

```typescript
// shared/components/form-field-info.tsx

import type { FieldApi } from '@tanstack/react-form';

interface FormFieldInfoProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: FieldApi<any, any, any, any>;
}

export function FormFieldInfo({ field }: FormFieldInfoProps) {
  const errors = field.state.meta.isTouched
    ? field.state.meta.errors
    : [];

  if (errors.length === 0) return null;

  return (
    <p className="mt-1 text-sm text-destructive">
      {errors.map((error, i) => (
        <span key={i}>{typeof error === 'string' ? error : error.message}</span>
      ))}
    </p>
  );
}
```

## Container Integration

Container handles mutation, form handles UI:

```typescript
// features/podcasts/containers/create-podcast-container.tsx

import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/api-client';
import { queryClient } from '@/clients/query-client';
import { getErrorMessage } from '@/shared/lib/errors';
import { CreatePodcastForm } from '../components/create-podcast-form';

export function CreatePodcastContainer() {
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: apiClient.podcasts.create,
    onSuccess: (podcast) => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
      toast.success('Podcast created');
      navigate({
        to: '/podcasts/$podcastId',
        params: { podcastId: podcast.id },
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create podcast'));
    },
  });

  const handleSubmit = async (values: CreatePodcastValues) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <CreatePodcastForm
      onSubmit={handleSubmit}
      isSubmitting={createMutation.isPending}
    />
  );
}
```

## Validation Patterns

### Required Field

```typescript
Schema.String.pipe(
  Schema.minLength(1, { message: () => 'This field is required' }),
)
```

### String Length

```typescript
Schema.String.pipe(
  Schema.minLength(3, { message: () => 'Must be at least 3 characters' }),
  Schema.maxLength(100, { message: () => 'Must be under 100 characters' }),
)
```

### Number Range

```typescript
Schema.Number.pipe(
  Schema.between(1, 60, { message: () => 'Must be between 1 and 60' }),
)
```

### Email

```typescript
Schema.String.pipe(
  Schema.pattern(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    { message: () => 'Invalid email address' }
  ),
)
```

### Optional with Default

```typescript
Schema.optional(Schema.String).pipe(
  Schema.withDefault(() => ''),
)
```

### Union/Literal

```typescript
Schema.Literal('conversation', 'voiceover')
```

### Array

```typescript
Schema.Array(Schema.String).pipe(
  Schema.minItems(1, { message: () => 'Select at least one item' }),
)
```

## Field Patterns

### Text Input

```typescript
<form.Field
  name="title"
  children={(field) => (
    <>
      <Label htmlFor={field.name}>Title</Label>
      <Input
        id={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      <FormFieldInfo field={field} />
    </>
  )}
/>
```

### Textarea

```typescript
<form.Field
  name="description"
  children={(field) => (
    <>
      <Label htmlFor={field.name}>Description</Label>
      <Textarea
        id={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        rows={4}
      />
      <FormFieldInfo field={field} />
    </>
  )}
/>
```

### Select

```typescript
<form.Field
  name="voice"
  children={(field) => (
    <>
      <Label>Voice</Label>
      <Select
        value={field.state.value}
        onValueChange={field.handleChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select voice" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="aoede">Aoede</SelectItem>
          <SelectItem value="charon">Charon</SelectItem>
        </SelectContent>
      </Select>
      <FormFieldInfo field={field} />
    </>
  )}
/>
```

### Checkbox

```typescript
<form.Field
  name="acceptTerms"
  children={(field) => (
    <div className="flex items-center gap-2">
      <Checkbox
        id={field.name}
        checked={field.state.value}
        onCheckedChange={field.handleChange}
      />
      <Label htmlFor={field.name}>
        I accept the terms and conditions
      </Label>
      <FormFieldInfo field={field} />
    </div>
  )}
/>
```

### Radio Group

```typescript
<form.Field
  name="format"
  children={(field) => (
    <>
      <Label>Format</Label>
      <RadioGroup
        value={field.state.value}
        onValueChange={field.handleChange}
        className="flex gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="conversation" id="conversation" />
          <Label htmlFor="conversation">Conversation</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="voiceover" id="voiceover" />
          <Label htmlFor="voiceover">Voice Over</Label>
        </div>
      </RadioGroup>
      <FormFieldInfo field={field} />
    </>
  )}
/>
```

### Slider

```typescript
<form.Field
  name="duration"
  children={(field) => (
    <>
      <div className="flex justify-between">
        <Label>Duration</Label>
        <span className="text-sm text-muted-foreground">
          {field.state.value} minutes
        </span>
      </div>
      <Slider
        value={[field.state.value]}
        onValueChange={([v]) => field.handleChange(v)}
        min={1}
        max={60}
        step={1}
      />
      <FormFieldInfo field={field} />
    </>
  )}
/>
```

## API Error Mapping

Map API validation errors to form fields:

```typescript
import { isDefinedError } from '@repo/api/client';

const createMutation = useMutation({
  mutationFn: apiClient.podcasts.create,
  onError: (error) => {
    if (isDefinedError(error) && error.code === 'VALIDATION_ERROR') {
      // Map field errors from API
      const fieldErrors = error.data as Record<string, string>;
      Object.entries(fieldErrors).forEach(([field, message]) => {
        form.setFieldMeta(field, (meta) => ({
          ...meta,
          errors: [message],
          isTouched: true,
        }));
      });
      return;
    }
    toast.error(getErrorMessage(error, 'Failed to create'));
  },
});
```

## Multi-Step Forms (Wizard)

```typescript
function PodcastWizard() {
  const [step, setStep] = useState(1);

  const form = useForm({
    defaultValues: {
      // Step 1
      title: '',
      format: 'conversation' as const,
      // Step 2
      documentIds: [] as string[],
      // Step 3
      hostVoice: 'Aoede',
      coHostVoice: 'Charon',
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value);
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      {step === 1 && <Step1 form={form} onNext={() => setStep(2)} />}
      {step === 2 && <Step2 form={form} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <Step3 form={form} onBack={() => setStep(2)} />}
    </form>
  );
}

function Step1({ form, onNext }) {
  const canProceed = form.useStore((s) =>
    s.values.title.length > 0 && !s.fieldMeta.title?.errors?.length
  );

  return (
    <>
      <form.Field name="title" children={...} />
      <form.Field name="format" children={...} />
      <Button type="button" onClick={onNext} disabled={!canProceed}>
        Next
      </Button>
    </>
  );
}
```

## Dynamic Fields

```typescript
function TagsField({ form }) {
  const tags = form.useStore((s) => s.values.tags);

  return (
    <div>
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <form.Field
            key={index}
            name={`tags.${index}`}
            children={(field) => (
              <div className="flex items-center gap-1">
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const current = form.getFieldValue('tags');
                    form.setFieldValue('tags', current.filter((_, i) => i !== index));
                  }}
                >
                  ×
                </Button>
              </div>
            )}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const current = form.getFieldValue('tags');
          form.setFieldValue('tags', [...current, '']);
        }}
      >
        Add Tag
      </Button>
    </div>
  );
}
```

## Anti-Patterns

### Validation in Submit

```typescript
// WRONG - validate only on submit
onSubmit: async ({ value }) => {
  if (!value.title) {
    toast.error('Title is required');
    return;
  }
  await submitMutation.mutateAsync(value);
}

// CORRECT - schema validates onChange
validators: {
  onChange: CreatePodcastSchema,
},
```

### Storing Form State Externally

```typescript
// WRONG - duplicating form state
const [title, setTitle] = useState('');
<Input value={title} onChange={(e) => setTitle(e.target.value)} />

// CORRECT - use form state
<form.Field
  name="title"
  children={(field) => (
    <Input
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
    />
  )}
/>
```

### Missing Error Display

```typescript
// WRONG - no error feedback
<form.Field
  name="title"
  children={(field) => (
    <Input value={field.state.value} onChange={...} />
  )}
/>

// CORRECT - show errors
<form.Field
  name="title"
  children={(field) => (
    <>
      <Input value={field.state.value} onChange={...} />
      <FormFieldInfo field={field} />
    </>
  )}
/>
```

### Submitting Without Preventing Default

```typescript
// WRONG - page reloads
<form onSubmit={() => form.handleSubmit()}>

// CORRECT - prevent default
<form onSubmit={(e) => {
  e.preventDefault();
  e.stopPropagation();
  form.handleSubmit();
}}>
```

### Not Disabling Submit

```typescript
// WRONG - can submit invalid/submitting form
<Button type="submit">Submit</Button>

// CORRECT - disable appropriately
<form.Subscribe
  selector={(state) => [state.canSubmit, state.isSubmitting]}
  children={([canSubmit, isSubmitting]) => (
    <Button type="submit" disabled={!canSubmit || isSubmitting}>
      {isSubmitting ? 'Submitting...' : 'Submit'}
    </Button>
  )}
/>
```
