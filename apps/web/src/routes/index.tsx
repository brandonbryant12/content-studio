import { ArrowRightIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { authClient } from '@/clients/authClient';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = authClient.useSession();

  if (session?.user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex flex-col">
      <section className="flex-1 flex items-center px-4 py-16 md:py-24">
        <div className="max-w-xl mx-auto w-full text-center">
          <h1 className="page-title-lg mb-4">Content Studio</h1>
          <p className="text-body-lg mb-8">
            Upload documents and generate podcasts, voiceovers, and other audio
            content.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/login">
                Sign in
                <ArrowRightIcon className="w-4 h-4 ml-1" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="px-4 py-6 border-t border-border mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-meta">Content Studio</span>
          <span className="text-meta">{new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
