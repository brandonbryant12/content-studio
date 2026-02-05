import {
  FileTextIcon,
  HomeIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import {
  Navigate,
  Outlet,
  createFileRoute,
  Link,
} from '@tanstack/react-router';
import { authClient } from '@/clients/authClient';
import { ErrorBoundary } from '@/shared/components/error-boundary';

export const Route = createFileRoute('/_protected')({
  component: Layout,
});

function Sidebar() {
  return (
    <aside className="w-[72px] border-r border-border/50 h-[calc(100vh-65px)] flex flex-col bg-sidebar items-center py-5">
      <nav className="flex-1 flex flex-col gap-1.5 w-full px-3">
        <Link
          to="/dashboard"
          className="group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          activeProps={{
            className:
              'bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-sm',
          }}
          inactiveProps={{
            className:
              'text-muted-foreground hover:bg-muted hover:text-foreground',
          }}
          aria-label="Dashboard"
        >
          <HomeIcon
            className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
            aria-hidden="true"
          />
        </Link>

        <div className="my-3 border-t border-border/60 w-6 mx-auto" />

        <Link
          to="/documents"
          className="group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          activeProps={{
            className:
              'bg-gradient-to-br from-sky-500/20 to-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm',
          }}
          inactiveProps={{
            className:
              'text-muted-foreground hover:bg-muted hover:text-foreground',
          }}
          aria-label="Documents"
        >
          <FileTextIcon
            className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
            aria-hidden="true"
          />
        </Link>

        <Link
          to="/podcasts"
          className="group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          activeProps={{
            className:
              'bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-sm',
          }}
          inactiveProps={{
            className:
              'text-muted-foreground hover:bg-muted hover:text-foreground',
          }}
          aria-label="Podcasts"
        >
          <MixerHorizontalIcon
            className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
            aria-hidden="true"
          />
        </Link>

        <Link
          to="/voiceovers"
          className="group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          activeProps={{
            className:
              'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm',
          }}
          inactiveProps={{
            className:
              'text-muted-foreground hover:bg-muted hover:text-foreground',
          }}
          aria-label="Voiceovers"
        >
          <SpeakerLoudIcon
            className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
            aria-hidden="true"
          />
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

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-65px)]">
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
      <main className="flex-1 overflow-auto h-[calc(100vh-65px)] bg-background">
        <ErrorBoundary resetKeys={[session?.user?.id]}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
