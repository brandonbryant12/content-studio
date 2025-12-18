import { FileTextIcon, PlusIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import {
  Navigate,
  Outlet,
  createFileRoute,
  Link,
} from '@tanstack/react-router';
import { useState } from 'react';
import CreateProjectDialog from './projects/-components/create-project';
import { apiClient } from '@/clients/apiClient';
import { authClient } from '@/clients/authClient';
import { ErrorBoundary } from '@/components/error-boundary';


export const Route = createFileRoute('/_protected')({
  component: Layout,
});

// ProjectItem removed as we now use inline links in the rail


function Sidebar() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: projects, isPending } = useQuery(
    apiClient.projects.list.queryOptions({ input: { limit: 20 } }),
  );

  return (
    <aside className="w-16 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-57px)] flex flex-col bg-gray-50/50 dark:bg-gray-900/50 items-center py-4">
      <div className="mb-6">
        <button
          onClick={() => setCreateOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-md hover:shadow-lg transition-all"
          title="New Project"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-4 w-full px-2 overflow-y-auto no-scrollbar">
        {isPending ? (
          <div className="flex justify-center">
            <Spinner className="w-4 h-4" />
          </div>
        ) : (
          projects?.map((project) => (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group relative"
              activeProps={{
                className:
                  'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700',
              }}
              inactiveProps={{
                className:
                  'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
              }}
              title={project.title}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 group-hover:from-violet-200 group-hover:to-fuchsia-200 dark:group-hover:from-violet-900 dark:group-hover:to-fuchsia-900 transition-colors">
                {project.title.charAt(0).toUpperCase()}
              </div>
            </Link>
          ))
        )}

        <div className="my-2 border-t border-gray-200 dark:border-gray-800 w-8 mx-auto" />

        <Link
          to="/documents"
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
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
      </nav>

      <div className="mt-auto pt-4">
        {/* Settings or User profile could go here */}
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
        <ErrorBoundary resetKeys={[session?.user?.id]}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
