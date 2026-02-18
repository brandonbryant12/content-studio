import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/clients/authClient';
import { isMicrosoftSSOAuthEnabled, isPasswordAuthEnabled } from '@/env';
import LoginCredentialsForm from '@/routes/_public/-components/login-form';

export const Route = createFileRoute('/_public/login')({
  component: RouteComponent,
});

function RouteComponent() {
  useEffect(() => {
    document.title = 'Sign In - Content Studio';
  }, []);

  const showPasswordAuth = isPasswordAuthEnabled;
  const showMicrosoftSSO = isMicrosoftSSOAuthEnabled;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <p className="page-eyebrow">Content Studio</p>
          <h1 className="page-title">Sign in</h1>
        </div>
        <div className="card-padded">
          {showMicrosoftSSO ? <MicrosoftSSOButton /> : null}
          {showMicrosoftSSO && showPasswordAuth ? (
            <p className="my-4 text-center text-sm text-muted-foreground">or</p>
          ) : null}
          {showPasswordAuth ? <LoginCredentialsForm /> : null}
        </div>
        {showPasswordAuth ? (
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
    });

    if (error) {
      setIsSubmitting(false);
      toast.error(error.message ?? 'Unable to sign in with Microsoft');
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
