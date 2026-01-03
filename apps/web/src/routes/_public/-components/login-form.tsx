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
                <Label
                  htmlFor={field.name}
                  className="text-gray-700 dark:text-gray-300"
                >
                  Email
                </Label>
                <Input
                  className="mt-1.5 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900"
                  id={field.name}
                  type="email"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="you@example.com"
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
              <Label
                htmlFor={field.name}
                className="text-gray-700 dark:text-gray-300"
              >
                Password
              </Label>
              <>
                <div className="flex justify-end items-center relative w-full">
                  <Input
                    className="mt-1.5 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 pr-10"
                    id={field.name}
                    type={isPasswordVisible ? 'text' : 'password'}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button
                    className="absolute mr-2 w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    type="button"
                    tabIndex={-1}
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsPasswordVisible(!isPasswordVisible);
                    }}
                  >
                    {isPasswordVisible ? <EyeOpenIcon /> : <EyeNoneIcon />}
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
            className="h-11 mt-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-md shadow-violet-500/20"
          >
            {isSubmitting ? <Spinner className="w-4 h-4" /> : 'Sign in'}
          </Button>
        )}
      />
    </form>
  );
}
