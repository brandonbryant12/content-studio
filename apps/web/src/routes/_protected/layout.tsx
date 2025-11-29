import {
  FileTextIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Navigate, Outlet, createFileRoute, Link } from '@tanstack/react-router';
import { authClient } from '@/clients/authClient';
import Spinner from '@/routes/-components/common/spinner';

export const Route = createFileRoute('/_protected')({
  component: Layout,
});

const navItems = [
  { to: '/documents', label: 'Documents', icon: FileTextIcon },
  { to: '/podcasts', label: 'Podcasts', icon: SpeakerLoudIcon },
] as const;

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
      activeProps={{
        className: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
      }}
      inactiveProps={{
        className: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200',
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="w-56 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-57px)] flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
          PodcastAI v1.0
        </div>
      </div>
    </aside>
  );
}

function Layout() {
  const { data: session, isPending } = authClient.useSession();

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
        <Outlet />
      </main>
    </div>
  );
}
