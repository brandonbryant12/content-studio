import { FileTextIcon, HomeIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import {
  Navigate,
  Outlet,
  createFileRoute,
  Link,
} from '@tanstack/react-router';
import { authClient } from '@/clients/authClient';
import { ErrorBoundary } from '@/components/error-boundary';
import { useSSESubscription } from '@/db';

export const Route = createFileRoute('/_protected')({
  component: Layout,
});

function Sidebar() {
  return (
    <aside className="w-16 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-57px)] flex flex-col bg-gray-50/50 dark:bg-gray-900/50 items-center py-4">
      <nav className="flex-1 flex flex-col gap-2 w-full px-2">
        <Link
          to="/dashboard"
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 mx-auto"
          activeProps={{
            className:
              'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
          }}
          inactiveProps={{
            className:
              'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
          }}
          title="Dashboard"
        >
          <HomeIcon className="w-5 h-5" />
        </Link>

        <div className="my-2 border-t border-gray-200 dark:border-gray-800 w-8 mx-auto" />

        <Link
          to="/documents"
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 mx-auto"
          activeProps={{
            className:
              'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
          }}
          inactiveProps={{
            className:
              'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
          }}
          title="Documents"
        >
          <FileTextIcon className="w-5 h-5" />
        </Link>

        <Link
          to="/podcasts"
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 mx-auto"
          activeProps={{
            className:
              'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400',
          }}
          inactiveProps={{
            className:
              'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
          }}
          title="Podcasts"
        >
          <SpeakerLoudIcon className="w-5 h-5" />
        </Link>
      </nav>

      <div className="mt-auto pt-4">
        {/* Settings or User profile could go here */}
      </div>
    </aside>
  );
}

function Layout() {
  const { data: session, isPending } = authClient.useSession();

  // Subscribe to SSE for real-time updates (only when authenticated)
  useSSESubscription();

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <Spinner />
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-auto h-[calc(100vh-57px)] bg-white dark:bg-gray-950">
        <ErrorBoundary resetKeys={[session?.user?.id]}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
