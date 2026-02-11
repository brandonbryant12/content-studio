import { Spinner } from '@repo/ui/components/spinner';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import React, { Suspense, lazy, useSyncExternalStore } from 'react';
import { authClient } from '@/clients/authClient';
import NavContainer from '@/routes/-components/layout/nav/nav-container';
import { Navbar } from '@/routes/-components/layout/nav/navbar';
import { ErrorBoundary } from '@/shared/components/error-boundary';

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

const emptySubscribe = () => () => {};

function RootComponent() {
  const { data: session, isPending } = authClient.useSession();
  // Defer Toaster rendering until after hydration.
  // useSyncExternalStore with getServerSnapshot returning false
  // avoids the need for useState+useEffect to detect mount.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

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
