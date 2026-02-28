# Forms

## Golden Principles

1. Validate on `onChange` via `Schema.standardSchemaV1` <!-- enforced-by: types -->
2. Always include `<FormFieldInfo field={field} />` for every field <!-- enforced-by: manual-review -->
3. Container handles submission logic (mutation); form handles UI <!-- enforced-by: manual-review -->
4. Prevent default on form submit <!-- enforced-by: manual-review -->

## Stack

| Concern | Tool |
|---------|------|
| Form state | TanStack Form |
| Validation | Effect Schema via `Schema.standardSchemaV1` |
| Error display | `FormFieldInfo` component |
| Submission | Container mutation passed as `onSubmit` |

## Form Setup

```tsx
import { useForm } from '@tanstack/react-form';
import { Schema } from 'effect';

const CreatePodcastSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
});

const FormSchema = Schema.standardSchemaV1(CreatePodcastSchema);

export function CreatePodcastForm({ onSubmit }: { onSubmit: (values: typeof CreatePodcastSchema.Type) => void }) {
  const form = useForm({
    defaultValues: { title: '', description: '' },
    validators: { onChange: FormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="title"
        validators={{ onChange: Schema.standardSchemaV1(CreatePodcastSchema.fields.title) }}
      >
        {(field) => (
          <div>
            <Label htmlFor={field.name}>Title</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FormFieldInfo field={field} />
          </div>
        )}
      </form.Field>

      <Button type="submit" disabled={form.state.isSubmitting}>
        Create
      </Button>
    </form>
  );
}
```

## FormFieldInfo Component

Displays validation errors beneath each field. Must be included for every `form.Field`.

```tsx
import type { AnyFieldApi } from '@tanstack/react-form';

export default function FormFieldInfo({ field }: { field: AnyFieldApi }) {
  const hasErrors = field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <div className="mt-2" aria-live="polite">
      {hasErrors ? (
        <em id={`${field.name}-error`} className="text-destructive">
          {field.state.meta.errors.map((e) => e.message).join(', ')}
        </em>
      ) : null}
      {field.state.meta.isValidating ? 'Validating...' : null}
    </div>
  );
}
```

> See `apps/web/src/routes/-components/common/form-field-info.tsx` for the actual implementation.

## Container Integration

The container owns the mutation. The form receives `onSubmit` as a prop.

```tsx
// Container
function CreatePodcastContainer() {
  const createMutation = useCreatePodcast();

  return (
    <CreatePodcastForm
      onSubmit={(values) => createMutation.mutate(values)}
    />
  );
}
```

## Validation Rules

| Timing | Use |
|--------|-----|
| `onChange` | Field-level validation (immediate feedback) |
| `onBlur` | Expensive validations (async uniqueness checks) |
| `onSubmit` | Full-form cross-field validation |

## Common Validators

Use Effect Schema for all validation. Compose with `pipe`:

```tsx
// Required string
Schema.String.pipe(Schema.nonEmptyString())

// String with length constraint
Schema.String.pipe(Schema.nonEmptyString(), Schema.maxLength(100))

// Optional with fallback
Schema.optional(Schema.String)
```

**Note:** `Schema.optional(Schema.String)` defaults to `''` not `undefined` -- use `||` not `??` for fallback.

## Checklist

- [ ] Every field has `<FormFieldInfo field={field} />` <!-- enforced-by: manual-review -->
- [ ] `e.preventDefault()` in form `onSubmit` handler <!-- enforced-by: manual-review -->
- [ ] Submit button `disabled={form.state.isSubmitting}` <!-- enforced-by: manual-review -->
- [ ] Container passes `onSubmit`, form never calls mutations directly <!-- enforced-by: manual-review -->
- [ ] Validation uses `Schema.standardSchemaV1()` wrapper <!-- enforced-by: types -->

**Canonical TanStack Form example:** `apps/web/src/routes/_public/-components/login-form.tsx`

## Controlled Form Pattern

Feature forms embedded in larger workflows (persona creation, podcast setup) use a simpler controlled-component pattern instead of TanStack Form:

```tsx
interface PersonaFormProps {
  values: PersonaFormValues;
  onChange: (values: PersonaFormValues) => void;
  disabled?: boolean;
}

export function PersonaForm({ values, onChange, disabled }: PersonaFormProps) {
  const handleFieldChange = useCallback(
    (field: keyof PersonaFormValues, value: string) => {
      onChange({ ...values, [field]: value });
    },
    [values, onChange],
  );

  return (
    <div>
      <Label>Name</Label>
      <Input
        value={values.name}
        onChange={(e) => handleFieldChange('name', e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
```

The container owns all state and validation. Use this pattern when the form is part of a multi-step flow where the container manages submission.

**Canonical controlled form example:** `apps/web/src/features/personas/components/persona-form.tsx`
