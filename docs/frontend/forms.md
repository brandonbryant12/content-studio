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

export function CreatePodcastForm({ onSubmit }: { onSubmit: (values: typeof CreatePodcastSchema.Type) => void }) {
  const form = useForm({
    defaultValues: { title: '', description: '' },
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
function FormFieldInfo({ field }: { field: FieldApi<any, any, any, any> }) {
  return (
    <>
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
        <p className="text-sm text-destructive mt-1">
          {field.state.meta.errors.join(', ')}
        </p>
      )}
    </>
  );
}
```

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

**Canonical example:** `apps/web/src/features/personas/components/persona-form.tsx`
