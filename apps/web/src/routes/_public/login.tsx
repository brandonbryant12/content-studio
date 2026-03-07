import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/clients/authClient';
import { isMicrosoftSSOAuthEnabled, isPasswordAuthEnabled } from '@/env';
import LoginCredentialsForm from '@/routes/_public/-components/login-form';
import {
  getAuthErrorMessage,
  getSSOCallbackErrorNotice,
  MICROSOFT_SSO_AUTH_FLOW,
} from '@/shared/lib/auth-errors';

export interface LoginSearch {
  readonly authFlow?: string;
  readonly code?: string;
  readonly error?: string;
  readonly error_description?: string;
  readonly message?: string;
}

const normalizeSearchValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const Route = createFileRoute('/_public/login')({
  validateSearch: (search): LoginSearch => ({
    authFlow: normalizeSearchValue(search.authFlow),
    code: normalizeSearchValue(search.code),
    error: normalizeSearchValue(search.error),
    error_description: normalizeSearchValue(search.error_description),
    message: normalizeSearchValue(search.message),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const ssoErrorNotice = getSSOCallbackErrorNotice(search);

  useEffect(() => {
    document.title = 'Sign In - Content Studio';
  }, []);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <p className="page-eyebrow">Content Studio</p>
          <h1 className="page-title">Sign in</h1>
        </div>
        <div className="card-padded">
          {ssoErrorNotice ? (
            <div
              className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 p-4"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm font-semibold text-destructive">
                {ssoErrorNotice.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ssoErrorNotice.description}
              </p>
            </div>
          ) : null}
          {isMicrosoftSSOAuthEnabled ? (
            <MicrosoftSSOButton />
          ) : (
            <LoginCredentialsForm />
          )}
        </div>
        {isPasswordAuthEnabled ? (
          <p className="auth-footer">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-link-primary">
              Sign up
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MicrosoftSSOButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMicrosoftSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await authClient.signIn.social({
      provider: 'microsoft',
      callbackURL: '/dashboard',
      errorCallbackURL: `/login?authFlow=${MICROSOFT_SSO_AUTH_FLOW}`,
    });

    if (error) {
      setIsSubmitting(false);
      toast.error(
        getAuthErrorMessage(error, 'Unable to sign in with Microsoft.'),
      );
    }
  };

  return (
    <Button
      type="button"
      className="h-11 w-full"
      onClick={handleMicrosoftSignIn}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <Spinner className="w-4 h-4" />
      ) : (
        'Continue with Microsoft'
      )}
    </Button>
  );
}
