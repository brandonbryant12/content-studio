import { EyeNoneIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Spinner } from '@repo/ui/components/spinner';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { Schema } from 'effect';
import { useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/clients/authClient';
import FormFieldInfo from '@/routes/-components/common/form-field-info';

const FormSchema = Schema.standardSchemaV1(
  Schema.Struct({
    email: Schema.String.pipe(
      Schema.filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), {
        message: () => 'Please enter a valid email address',
      }),
    ),
    password: Schema.String.pipe(
      Schema.minLength(8, {
        message: () => 'Password must be at least 8 characters',
      }),
    ),
  }),
);

export default function LoginCredentialsForm() {
  const navigate = useNavigate();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onChange: FormSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            navigate({ to: '/dashboard' });
          },
        },
      );
      if (error) {
        toast.error(error.message ?? 'An unexpected error occurred');
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div>
        <form.Field
          name="email"
          children={(field) => {
            return (
              <>
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  className="mt-1.5 h-11 bg-muted/50 border-border focus:bg-background"
                  id={field.name}
                  type="email"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-describedby={`${field.name}-error`}
                  aria-invalid={
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                  }
                />
                <FormFieldInfo field={field} />
              </>
            );
          }}
        />
      </div>
      <div>
        <form.Field
          name="password"
          children={(field) => (
            <>
              <Label htmlFor={field.name}>Password</Label>
              <>
                <div className="flex justify-end items-center relative w-full">
                  <Input
                    className="mt-1.5 h-11 bg-muted/50 border-border focus:bg-background pr-10"
                    id={field.name}
                    type={isPasswordVisible ? 'text' : 'password'}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    aria-describedby={`${field.name}-error`}
                    aria-invalid={
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0
                    }
                  />
                  <Button
                    className="absolute mr-2 w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
                    type="button"
                    tabIndex={-1}
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsPasswordVisible(!isPasswordVisible);
                    }}
                    aria-label={
                      isPasswordVisible ? 'Hide password' : 'Show password'
                    }
                  >
                    {isPasswordVisible ? (
                      <EyeOpenIcon aria-hidden="true" />
                    ) : (
                      <EyeNoneIcon aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <FormFieldInfo field={field} />
              </>
            </>
          )}
        />
      </div>
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-11 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
          >
            {isSubmitting ? <Spinner className="w-4 h-4" /> : 'Sign in'}
          </Button>
        )}
      />
    </form>
  );
}
