import { FileTextIcon, PlusIcon, StackIcon } from '@radix-ui/react-icons';
import { useQuery } from '@tanstack/react-query';
import {
  Navigate,
  Outlet,
  createFileRoute,
  Link,
} from '@tanstack/react-router';
import { useState } from 'react';
import { authClient } from '@/clients/authClient';
import { apiClient } from '@/clients/apiClient';
import CreateProjectDialog from './projects/-components/create-project';
import Spinner from '@/routes/-components/common/spinner';

export const Route = createFileRoute('/_protected')({
  component: Layout,
});

function ProjectItem({ id, title }: { id: string; title: string }) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: id }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 truncate"
      activeProps={{
        className:
          'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
      }}
      inactiveProps={{
        className:
          'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200',
      }}
    >
      <StackIcon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{title}</span>
    </Link>
  );
}

function Sidebar() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: projects, isPending } = useQuery(
    apiClient.projects.list.queryOptions({ input: { limit: 20 } }),
  );

  return (
    <aside className="w-56 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-57px)] flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          New Project
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
          Projects
        </div>
        {isPending ? (
          <div className="flex justify-center py-4">
            <Spinner className="w-4 h-4" />
          </div>
        ) : projects?.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2">
            No projects yet
          </p>
        ) : (
          projects?.map((project) => (
            <ProjectItem
              key={project.id}
              id={project.id}
              title={project.title}
            />
          ))
        )}

        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
          <Link
            to="/documents"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200"
            activeProps={{
              className:
                'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
            }}
            inactiveProps={{
              className:
                'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200',
            }}
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            Documents
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
          PodcastAI v1.0
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
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
