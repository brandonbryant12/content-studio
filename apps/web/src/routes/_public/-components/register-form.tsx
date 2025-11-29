import { EyeNoneIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import * as v from 'valibot';
import { authClient } from '@/clients/authClient';
import FormFieldInfo from '@/routes/-components/common/form-field-info';
import Spinner from '@/routes/-components/common/spinner';

const FormSchema = v.pipe(
  v.object({
    name: v.pipe(
      v.string(),
      v.minLength(2, 'Name must be at least 2 characters'),
    ),
    email: v.pipe(v.string(), v.email('Please enter a valid email address')),
    password: v.pipe(
      v.string(),
      v.minLength(8, 'Password must be at least 8 characters'),
    ),
    confirmPassword: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      (input) => input.password === input.confirmPassword,
      'The two passwords do not match.',
    ),
    ['confirmPassword'],
  ),
);

export default function RegisterCredentialsForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: FormSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signUp.email(
        {
          name: value.name,
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            navigate({ to: '/podcasts' });
          },
        },
      );
      if (error) {
        toast.error(error.message ?? JSON.stringify(error));
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
          name="name"
          children={(field) => (
            <>
              <Label htmlFor={field.name} className="text-gray-700 dark:text-gray-300">
                Full Name
              </Label>
              <Input
                className="mt-1.5 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900"
                id={field.name}
                type="text"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="John Doe"
              />
              <FormFieldInfo field={field} />
            </>
          )}
        />
      </div>
      <div>
        <form.Field
          name="email"
          children={(field) => (
            <>
              <Label htmlFor={field.name} className="text-gray-700 dark:text-gray-300">
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
          )}
        />
      </div>
      <div>
        <form.Field
          name="password"
          children={(field) => (
            <>
              <Label htmlFor={field.name} className="text-gray-700 dark:text-gray-300">
                Password
              </Label>
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
          )}
        />
      </div>
      <div>
        <form.Field
          name="confirmPassword"
          children={(field) => (
            <>
              <Label htmlFor={field.name} className="text-gray-700 dark:text-gray-300">
                Confirm Password
              </Label>
              <div className="flex justify-end items-center relative w-full">
                <Input
                  className="mt-1.5 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 pr-10"
                  id={field.name}
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
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
                    setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
                  }}
                >
                  {isConfirmPasswordVisible ? <EyeOpenIcon /> : <EyeNoneIcon />}
                </Button>
              </div>
              <FormFieldInfo field={field} />
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
            {isSubmitting ? <Spinner className="w-4 h-4" /> : 'Create account'}
          </Button>
        )}
      />
    </form>
  );
}
