import { Toaster } from '@repo/ui/components/sonner';
import { Spinner } from '@repo/ui/components/spinner';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { useSyncExternalStore } from 'react';
import { authClient } from '@/clients/authClient';
import NavContainer from '@/routes/-components/layout/nav/nav-container';
import { Navbar } from '@/routes/-components/layout/nav/navbar';
import { ErrorBoundary } from '@/shared/components/error-boundary';

export const Route = createRootRoute({
  component: RootComponent,
});


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
        <div className="flex items-center justify-center h-[calc(100vh-var(--navbar-height))]">
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
      }}
    >
      <div className="min-h-screen bg-background">
        <Navbar session={session} />
        {mounted && <Toaster position="bottom-right" />}
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
