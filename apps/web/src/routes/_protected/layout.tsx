import {
  ActivityLogIcon,
  AvatarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  HomeIcon,
  ImageIcon,
  MixerHorizontalIcon,
  MoonIcon,
  SpeakerLoudIcon,
  SunIcon,
} from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import {
  Navigate,
  Outlet,
  createFileRoute,
  Link,
} from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { authClient } from '@/clients/authClient';
import { useSSERecovery } from '@/providers/sse-provider';
import UserAvatar from '@/routes/-components/layout/nav/user-avatar';
import {
  ErrorBoundary,
  ErrorFallback,
} from '@/shared/components/error-boundary';
import { useIsAdmin } from '@/shared/hooks/use-is-admin';
import { useSidebar } from '@/shared/hooks/use-sidebar';

export const Route = createFileRoute('/_protected')({
  component: Layout,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-[calc(100vh-var(--navbar-height))]">
      <Spinner />
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <ErrorFallback
      error={error instanceof Error ? error : new Error(String(error))}
      resetErrorBoundary={reset}
    />
  ),
});

type ColorScheme = 'primary' | 'sky' | 'violet' | 'emerald' | 'amber' | 'rose';

const COLOR_SCHEMES: Record<
  ColorScheme,
  { color: string; activeColor: string }
> = {
  primary: {
    color:
      'bg-primary/15 text-primary group-hover:bg-primary/20 dark:bg-primary/10 dark:group-hover:bg-primary/15',
    activeColor:
      '[&_div]:bg-primary/20 [&_div]:text-primary dark:[&_div]:bg-primary/15',
  },
  sky: {
    color:
      'bg-sky-100 text-sky-600 group-hover:bg-sky-200/70 dark:bg-sky-500/10 dark:text-sky-400 dark:group-hover:bg-sky-500/15',
    activeColor:
      '[&_div]:bg-sky-200/70 [&_div]:text-sky-600 dark:[&_div]:bg-sky-500/15 dark:[&_div]:text-sky-400',
  },
  violet: {
    color:
      'bg-violet-100 text-violet-600 group-hover:bg-violet-200/70 dark:bg-violet-500/10 dark:text-violet-400 dark:group-hover:bg-violet-500/15',
    activeColor:
      '[&_div]:bg-violet-200/70 [&_div]:text-violet-600 dark:[&_div]:bg-violet-500/15 dark:[&_div]:text-violet-400',
  },
  emerald: {
    color:
      'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-400 dark:group-hover:bg-emerald-500/15',
    activeColor:
      '[&_div]:bg-emerald-200/70 [&_div]:text-emerald-600 dark:[&_div]:bg-emerald-500/15 dark:[&_div]:text-emerald-400',
  },
  amber: {
    color:
      'bg-amber-100 text-amber-600 group-hover:bg-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:group-hover:bg-amber-500/15',
    activeColor:
      '[&_div]:bg-amber-200/70 [&_div]:text-amber-600 dark:[&_div]:bg-amber-500/15 dark:[&_div]:text-amber-400',
  },
  rose: {
    color:
      'bg-rose-100 text-rose-600 group-hover:bg-rose-200/70 dark:bg-rose-500/10 dark:text-rose-400 dark:group-hover:bg-rose-500/15',
    activeColor:
      '[&_div]:bg-rose-200/70 [&_div]:text-rose-600 dark:[&_div]:bg-rose-500/15 dark:[&_div]:text-rose-400',
  },
};

interface NavItemProps {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  colorScheme: ColorScheme;
  collapsed: boolean;
}

function NavItem({
  to,
  icon: Icon,
  label,
  colorScheme,
  collapsed,
}: NavItemProps) {
  const { color, activeColor } = COLOR_SCHEMES[colorScheme];

  const link = (
    <Link
      to={to}
      className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
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
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${color}`}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <span
        className={`text-sm font-medium whitespace-nowrap transition-[opacity,transform] duration-200 ${
          collapsed
            ? 'opacity-0 scale-95 w-0 overflow-hidden'
            : 'opacity-100 scale-100'
        }`}
      >
        {label}
      </span>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SectionLabel({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  if (collapsed) return null;
  return (
    <span className="text-xs font-medium text-muted-foreground/70 px-3 mb-1">
      {label}
    </span>
  );
}

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  const button = (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-center h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="w-4 h-4" />
      ) : (
        <MoonIcon className="w-4 h-4" />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function Sidebar({
  isAdmin,
  collapsed,
  onToggle,
  user,
}: {
  isAdmin: boolean;
  collapsed: boolean;
  onToggle: () => void;
  user: typeof authClient.$Infer.Session.user;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={`${
          collapsed ? 'w-[68px]' : 'w-[220px]'
        } border-r border-border/60 h-[calc(100vh-var(--navbar-height))] flex flex-col bg-sidebar shrink-0 transition-[width] duration-300 ease-in-out`}
      >
        <nav
          className="flex-1 flex flex-col gap-0.5 px-3 py-4"
          aria-label="Main navigation"
        >
          <NavItem
            to="/dashboard"
            icon={HomeIcon}
            label="Dashboard"
            colorScheme="primary"
            collapsed={collapsed}
          />

          <div className="my-3 border-t border-border/50 mx-1" />
          <SectionLabel label="Create" collapsed={collapsed} />

          <NavItem
            to="/podcasts"
            icon={MixerHorizontalIcon}
            label="Podcasts"
            colorScheme="violet"
            collapsed={collapsed}
          />

          <NavItem
            to="/voiceovers"
            icon={SpeakerLoudIcon}
            label="Voiceovers"
            colorScheme="emerald"
            collapsed={collapsed}
          />

          <NavItem
            to="/infographics"
            icon={ImageIcon}
            label="Infographics"
            colorScheme="amber"
            collapsed={collapsed}
          />

          <div className="my-3 border-t border-border/50 mx-1" />
          <SectionLabel label="Assets" collapsed={collapsed} />

          <NavItem
            to="/sources"
            icon={FileTextIcon}
            label="Sources"
            colorScheme="sky"
            collapsed={collapsed}
          />

          <NavItem
            to="/personas"
            icon={AvatarIcon}
            label="Personas"
            colorScheme="rose"
            collapsed={collapsed}
          />

          {isAdmin && (
            <>
              <div className="my-3 border-t border-border/50 mx-1" />

              <NavItem
                to="/admin/activity"
                icon={ActivityLogIcon}
                label="Admin"
                colorScheme="rose"
                collapsed={collapsed}
              />
            </>
          )}
        </nav>

        <div className="px-3 pb-3 flex flex-col gap-2">
          <div className="border-t border-border/50 mx-1 mb-1" />

          <div
            className={`flex items-center ${collapsed ? 'justify-center' : 'px-1'}`}
          >
            <UserAvatar user={user} collapsed={collapsed} />
          </div>

          <ThemeToggle collapsed={collapsed} />

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggle}
                  className="w-full flex items-center justify-center h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Expand sidebar"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
                <span className="ml-1.5 text-xs opacity-60">[</span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={onToggle}
              className="w-full flex items-center justify-center h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

function Layout() {
  const { data: session, isPending } = authClient.useSession();
  const { isCollapsed, toggle } = useSidebar();
  const isAdmin = useIsAdmin();
  useSSERecovery();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '[' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--navbar-height))]">
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
      <Sidebar
        isAdmin={isAdmin}
        collapsed={isCollapsed}
        onToggle={toggle}
        user={session.user}
      />
      <main
        id="main-content"
        className="flex-1 min-w-0 overflow-auto h-[calc(100vh-var(--navbar-height))] bg-background"
      >
        <ErrorBoundary resetKeys={[session?.user?.id]}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
