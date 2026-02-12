import { Spinner } from '@repo/ui/components/spinner';
import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router';
import { authClient } from '@/clients/authClient';

export const Route = createFileRoute('/_public')({
  component: Layout,
});

function Layout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        role="status"
        aria-label="Loading"
      >
        <Spinner />
      </div>
    );
  }

  if (!session?.user) {
    return <Outlet />;
  }

  return <Navigate to="/" />;
}
