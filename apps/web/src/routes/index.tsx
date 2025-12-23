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
      {/* Hero Section */}
      <section className="flex-1 flex items-center px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left: Text Content */}
            <div>
              <p className="page-eyebrow mb-4">Document to Audio</p>
              <h1 className="page-title-lg mb-6">
                Transform your writing into{' '}
                <span className="text-accent">podcasts</span>
              </h1>
              <p className="text-body-lg max-w-md mb-8">
                Upload documents and generate natural, engaging audio content.
                Professional voice-overs or conversational podcasts in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                  <Link to="/register">
                    Get started
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </div>

            {/* Right: Visual Element */}
            <div className="hidden md:block">
              <div className="relative">
                <div className="waveform-container">
                  <div className="waveform-bars">
                    {[
                      0.3, 0.5, 0.8, 0.6, 1, 0.7, 0.9, 0.4, 0.6, 0.8, 0.5, 0.7,
                      0.3, 0.5, 0.9, 0.6, 0.4, 0.7, 0.5, 0.3,
                    ].map((height, i) => (
                      <div
                        key={i}
                        className="waveform-bar"
                        style={{ height: `${height * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="waveform-meta text-meta">
                    <span>00:00</span>
                    <span className="text-foreground font-medium">
                      Generated Audio
                    </span>
                    <span>03:24</span>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 border border-border rounded-lg -z-10" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-primary/10 rounded-lg -z-10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <p className="page-eyebrow mb-8">How it works</p>
          <div className="content-grid-3">
            <FeatureBlock
              number="01"
              title="Upload"
              description="Drop in your PDF, DOCX, or text file. Our system extracts and processes the content."
            />
            <FeatureBlock
              number="02"
              title="Generate"
              description="AI creates a natural script and synthesizes realistic voices for your audio."
            />
            <FeatureBlock
              number="03"
              title="Export"
              description="Download your podcast or voice-over. Edit the script anytime and regenerate."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-border mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-meta">Content Studio</span>
          <span className="text-meta">{new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureBlock({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <span className="text-meta text-accent mb-3 block">{number}</span>
      <h3 className="font-editorial text-xl font-semibold mb-2 text-foreground">
        {title}
      </h3>
      <p className="text-body">{description}</p>
    </div>
  );
}
