import type { AnyFieldApi } from '@tanstack/react-form';

export default function FormFieldInfo({ field }: { field: AnyFieldApi }) {
  const hasErrors =
    field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <div className="mt-2" aria-live="polite">
      {hasErrors ? (
        <em id={`${field.name}-error`} className="text-red-500">
          {field.state.meta.errors.map((e) => e.message).join(', ')}
        </em>
      ) : null}
      {field.state.meta.isValidating ? 'Validating...' : null}
    </div>
  );
}
