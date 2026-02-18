import { Spinner } from '@repo/ui/components/spinner';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter as createTanstackRouter } from '@tanstack/react-router';
import { queryClient } from '@/clients/queryClient';
import { env } from '@/env';
import { SSEProvider } from '@/providers/sse-provider';
import { routeTree } from '@/routeTree.gen';

export function createRouter() {
  const router = createTanstackRouter({
    routeTree,
    basepath: env.PUBLIC_BASE_PATH,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Query staleTime controls freshness for loader-backed data.
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: () => (
      <div
        className="flex w-full items-center justify-center h-full min-h-[200px]"
        data-testid="route-loading-spinner"
      >
        <Spinner className="w-6 h-6" />
      </div>
    ),
    Wrap: function WrapComponent({ children }) {
      return (
        <QueryClientProvider client={queryClient}>
          <SSEProvider>{children}</SSEProvider>
        </QueryClientProvider>
      );
    },
  });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
