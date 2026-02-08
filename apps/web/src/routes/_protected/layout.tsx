import {
  FileTextIcon,
  HomeIcon,
  ImageIcon,
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

interface NavItemProps {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  color: string;
  activeColor: string;
}

function NavItem({ to, icon: Icon, label, color, activeColor }: NavItemProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      activeProps={{
        className: `bg-primary/8 text-foreground ${activeColor}`,
      }}
      inactiveProps={{
        className:
          'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      }}
      aria-label={label}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${color}`}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="w-[220px] border-r border-border/60 h-[calc(100vh-57px)] flex flex-col bg-sidebar shrink-0">
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4">
        <NavItem
          to="/dashboard"
          icon={HomeIcon}
          label="Dashboard"
          color="bg-primary/10 text-primary group-hover:bg-primary/15"
          activeColor="[&_div]:bg-primary/15 [&_div]:text-primary"
        />

        <div className="my-3 border-t border-border/50 mx-1" />

        <NavItem
          to="/documents"
          icon={FileTextIcon}
          label="Documents"
          color="bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500/15"
          activeColor="[&_div]:bg-sky-500/15 [&_div]:text-sky-600 dark:[&_div]:text-sky-400"
        />

        <NavItem
          to="/podcasts"
          icon={MixerHorizontalIcon}
          label="Podcasts"
          color="bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/15"
          activeColor="[&_div]:bg-violet-500/15 [&_div]:text-violet-600 dark:[&_div]:text-violet-400"
        />

        <NavItem
          to="/voiceovers"
          icon={SpeakerLoudIcon}
          label="Voiceovers"
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/15"
          activeColor="[&_div]:bg-emerald-500/15 [&_div]:text-emerald-600 dark:[&_div]:text-emerald-400"
        />

        <NavItem
          to="/infographics"
          icon={ImageIcon}
          label="Infographics"
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/15"
          activeColor="[&_div]:bg-amber-500/15 [&_div]:text-amber-600 dark:[&_div]:text-amber-400"
        />
      </nav>
    </aside>
  );
}

function Layout() {
  const { data: session, isPending } = authClient.useSession();
  useSSERecovery();

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:m-2"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 overflow-auto h-[calc(100vh-57px)] bg-background"
      >
        <ErrorBoundary resetKeys={[session?.user?.id]}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
