import { Spinner } from '@repo/ui/components/spinner';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { authClient } from '@/clients/authClient';
import { ErrorBoundary } from '@/shared/components/error-boundary';
import NavContainer from '@/routes/-components/layout/nav/nav-container';
import { Navbar } from '@/routes/-components/layout/nav/navbar';

// Defer Toaster loading until after hydration
const Toaster = lazy(() =>
  import('@repo/ui/components/sonner').then((m) => ({ default: m.Toaster })),
);

export const Route = createRootRoute({
  component: RootComponent,
});

// https://tanstack.com/router/v1/docs/framework/react/devtools
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : React.lazy(() =>
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    );

function RootComponent() {
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);

  // Defer Toaster rendering until after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <NavContainer>
          <div />
        </NavContainer>
        <div className="flex items-center justify-center h-[calc(100vh-57px)]">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error) => {
        if (import.meta.env.DEV) {
          console.error('Root error boundary caught:', error);
        }
        // TODO: Send to error tracking service in production
      }}
    >
      <div className="min-h-screen bg-background">
        <Navbar session={session} />
        {mounted && (
          <Suspense fallback={null}>
            <Toaster position="bottom-right" />
          </Suspense>
        )}
        <Outlet />
        <React.Suspense>
          <TanStackRouterDevtools position="top-right" />
        </React.Suspense>
      </div>
    </ErrorBoundary>
  );
}
