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
import type { ComponentType } from 'react';
import { authClient } from '@/clients/authClient';
import { ErrorBoundary } from '@/shared/components/error-boundary';
import { useSSERecovery } from '@/providers/sse-provider';

export const Route = createFileRoute('/_protected')({
  component: Layout,
});

interface NavLinkProps {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  activeClassName: string;
}

function NavLink({ to, icon: Icon, label, activeClassName }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      activeProps={{ className: activeClassName }}
      inactiveProps={{
        className: 'text-muted-foreground hover:bg-muted hover:text-foreground',
      }}
      aria-label={label}
    >
      <Icon
        className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
        aria-hidden="true"
      />
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="w-[72px] border-r border-border/50 h-[calc(100vh-65px)] flex flex-col bg-sidebar items-center py-5">
      <nav className="flex-1 flex flex-col gap-1.5 w-full px-3">
        <NavLink
          to="/dashboard"
          icon={HomeIcon}
          label="Dashboard"
          activeClassName="bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-sm"
        />

        <div className="my-3 border-t border-border/60 w-6 mx-auto" />

        <NavLink
          to="/documents"
          icon={FileTextIcon}
          label="Documents"
          activeClassName="bg-gradient-to-br from-sky-500/20 to-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm"
        />

        <NavLink
          to="/podcasts"
          icon={MixerHorizontalIcon}
          label="Podcasts"
          activeClassName="bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-sm"
        />

        <NavLink
          to="/voiceovers"
          icon={SpeakerLoudIcon}
          label="Voiceovers"
          activeClassName="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
        />
      </nav>

      <div className="mt-auto pt-4">
        {/* Settings or User profile could go here */}
      </div>
    </aside>
  );
}

function Layout() {
  const { data: session, isPending } = authClient.useSession();
  useSSERecovery();

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:m-2"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 overflow-auto h-[calc(100vh-65px)] bg-background"
      >
        <ErrorBoundary resetKeys={[session?.user?.id]}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
