import {
  ArrowRightIcon,
  FileTextIcon,
  ImageIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { authClient } from '@/clients/authClient';
import { APP_NAME } from '@/constants';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

const HERO_WAVEFORM_BARS = [
  { height: 'hero-wave-h-40', delay: 'hero-wave-delay-0' },
  { height: 'hero-wave-h-70', delay: 'hero-wave-delay-1' },
  { height: 'hero-wave-h-100', delay: 'hero-wave-delay-2' },
  { height: 'hero-wave-h-60', delay: 'hero-wave-delay-3' },
  { height: 'hero-wave-h-85', delay: 'hero-wave-delay-4' },
  { height: 'hero-wave-h-45', delay: 'hero-wave-delay-5' },
  { height: 'hero-wave-h-95', delay: 'hero-wave-delay-6' },
  { height: 'hero-wave-h-50', delay: 'hero-wave-delay-7' },
  { height: 'hero-wave-h-75', delay: 'hero-wave-delay-8' },
  { height: 'hero-wave-h-35', delay: 'hero-wave-delay-9' },
  { height: 'hero-wave-h-90', delay: 'hero-wave-delay-10' },
  { height: 'hero-wave-h-55', delay: 'hero-wave-delay-11' },
  { height: 'hero-wave-h-80', delay: 'hero-wave-delay-12' },
  { height: 'hero-wave-h-40', delay: 'hero-wave-delay-13' },
  { height: 'hero-wave-h-65', delay: 'hero-wave-delay-14' },
] as const;

function WaveformBars() {
  return (
    <div className="flex items-end gap-[3px] h-16" aria-hidden="true">
      {HERO_WAVEFORM_BARS.map((bar, i) => (
        <div key={i} className={`hero-wave-bar ${bar.height} ${bar.delay}`} />
      ))}
    </div>
  );
}

function RouteComponent() {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    document.title = 'Content Studio';
  }, []);

  if (session?.user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-[calc(100vh-var(--navbar-height))] flex flex-col bg-background overflow-hidden">
      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-6 py-20 md:py-28">
        {/* Background orbs */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[100px] pointer-events-none bg-[hsl(var(--chart-1))]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[80px] pointer-events-none bg-[hsl(var(--chart-3))]"
          aria-hidden="true"
        />
        <div
          className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full opacity-[0.04] blur-[60px] pointer-events-none bg-[hsl(var(--chart-2))]"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl mx-auto w-full text-center">
          {/* Waveform accent */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <WaveformBars />
          </div>

          {/* Eyebrow */}
          <p className="page-eyebrow animate-fade-in-up">
            Ideate. Generate. Publish.
          </p>

          {/* Headline */}
          <h1 className="hero-title font-serif font-bold tracking-tight text-foreground leading-[1.05] animate-fade-in-up stagger-1">
            Where ideas become <span className="text-primary">content</span>
          </h1>

          {/* Subtitle */}
          <p className="text-body-lg mt-6 max-w-xl mx-auto animate-fade-in-up stagger-2">
            Generate podcasts, voiceovers, infographics, and more — AI-powered
            content creation across every modality.
          </p>

          {/* CTAs */}
          <div className="flex justify-center gap-3 mt-10 animate-fade-in-up stagger-3">
            <Button
              asChild
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <Link to="/register">
                Get started
                <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto space-y-24">
          {[
            {
              icon: FileTextIcon,
              label: 'Knowledge Base',
              headline: 'Your content starts here',
              desc: 'Upload documents, import from URLs, or use AI-powered deep research to build your knowledge base. Every piece of content you create draws from this foundation.',
              image: '/screenshots/documents.png',
              color: 'text-sky-400',
              iconBg: 'bg-sky-500/10',
            },
            {
              icon: MixerHorizontalIcon,
              label: 'Podcasts',
              headline: 'Conversations, crafted by AI',
              desc: 'Generate multi-voice podcast episodes with custom personas drawn from your knowledge base. Interactively edit every line of the script, then export broadcast-ready audio.',
              image: '/screenshots/podcasts.png',
              color: 'text-violet-400',
              iconBg: 'bg-violet-500/10',
              reverse: true,
            },
            {
              icon: SpeakerLoudIcon,
              label: 'Voiceovers',
              headline: 'Crisp narration, built-in writing assistant',
              desc: 'Create polished voiceovers with natural-sounding voices. A built-in writing assistant helps you refine your script before generating audio — perfect for explainers, intros, and more.',
              image: '/screenshots/voiceovers.png',
              color: 'text-emerald-400',
              iconBg: 'bg-emerald-500/10',
            },
            {
              icon: ImageIcon,
              label: 'Infographics',
              headline: 'Custom visuals, your style',
              desc: 'Generate eye-catching images and infographics from prompts. Save custom styles to keep your brand consistent across every visual you create.',
              image: '/screenshots/infographics.png',
              color: 'text-amber-400',
              iconBg: 'bg-amber-500/10',
              reverse: true,
            },
          ].map(
            ({
              icon: Icon,
              label,
              headline,
              desc,
              image,
              color,
              iconBg,
              reverse,
            }) => (
              <div
                key={label}
                className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 md:gap-16`}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className={`inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full ${iconBg}`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} aria-hidden="true" />
                    <span className={`text-sm font-medium ${color}`}>
                      {label}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-2xl md:text-3xl text-foreground mb-3">
                    {headline}
                  </h3>
                  <p className="text-body-lg text-muted-foreground leading-relaxed">
                    {desc}
                  </p>
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <img
                    src={image}
                    alt={`${label} screenshot`}
                    className="rounded-xl border border-border shadow-2xl shadow-black/20 w-full"
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-border mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-meta">{APP_NAME}</span>
          <span className="text-meta">{new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
