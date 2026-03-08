import {
  ArrowRightIcon,
  CheckCircledIcon,
  FileTextIcon,
  ImageIcon,
  LightningBoltIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { authClient } from '@/clients/authClient';
import { AI_APP_NAME, APP_NAME, formatProductPageTitle } from '@/constants';
import { isPasswordAuthEnabled } from '@/env';

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
  const primaryCtaPath = isPasswordAuthEnabled ? '/register' : '/login';
  const primaryCtaLabel = isPasswordAuthEnabled ? 'Sign up' : 'Sign in';

  useEffect(() => {
    document.title = formatProductPageTitle();
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
          <p className="page-eyebrow animate-fade-in-up">{AI_APP_NAME}</p>

          {/* Headline */}
          <h1 className="hero-title font-serif font-bold tracking-tight text-foreground leading-[1.05] animate-fade-in-up stagger-1">
            Create compliant, high-quality content —{' '}
            <span className="text-primary">powered by AI</span>
          </h1>

          {/* Subtitle */}
          <p className="text-body-lg mt-6 max-w-xl mx-auto animate-fade-in-up stagger-2">
            Upload your sources, paste a URL, or let AI research a topic.
            {` ${APP_NAME} generates polished podcasts, voiceovers, and visuals you can trust — grounded in your sources.`}
          </p>

          {/* CTAs */}
          <div className="flex justify-center gap-3 mt-10 animate-fade-in-up stagger-3">
            <Button
              asChild
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <Link to={primaryCtaPath}>
                {primaryCtaLabel}
                <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 pb-20 md:pb-28">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif font-bold text-2xl md:text-3xl text-foreground text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0">
            {[
              {
                step: 1,
                icon: FileTextIcon,
                title: 'Add your sources',
                desc: 'Upload PDFs, paste URLs, or let AI deep-research a topic for you.',
                color: 'text-sky-500',
                bg: 'bg-sky-500',
              },
              {
                step: 2,
                icon: LightningBoltIcon,
                title: 'AI creates your content',
                desc: `Choose your format — podcast, voiceover, or infographic — and ${APP_NAME} generates it from your approved sources.`,
                color: 'text-primary',
                bg: 'bg-primary',
              },
              {
                step: 3,
                icon: CheckCircledIcon,
                title: 'Review, refine, approve',
                desc: 'Fine-tune scripts, swap voices, adjust styles — review every detail before finalizing.',
                color: 'text-emerald-500',
                bg: 'bg-emerald-500',
              },
            ].map(({ step, icon: Icon, title, desc, color, bg }, i) => (
              <div
                key={step}
                className="relative flex flex-col items-center text-center px-6"
              >
                {/* Connector line between steps (desktop only) */}
                {i < 2 && (
                  <div
                    className="hidden sm:block absolute top-5 left-[calc(50%+24px)] w-[calc(100%-48px)] border-t-2 border-dashed border-border"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg} text-sm font-semibold text-white mb-4`}
                >
                  {step}
                </span>
                <Icon className={`w-5 h-5 ${color} mb-3`} aria-hidden="true" />
                <h3 className="font-serif font-semibold text-base text-foreground mb-1.5">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto space-y-24">
          {[
            {
              icon: FileTextIcon,
              label: 'Sources',
              headline: 'Ground every asset in verified source material',
              desc: 'Upload approved files, import web pages, or let AI deep-research a topic. Your source library becomes the single source of truth behind every piece of content.',
              image: '/screenshots/documents.png',
              color: 'text-sky-400',
              iconBg: 'bg-sky-500/10',
            },
            {
              icon: MixerHorizontalIcon,
              label: 'Podcasts',
              headline: 'Generate a podcast episode from a single source',
              desc: 'Select your sources, choose conversation or monologue format, assign reusable personas so each episode keeps the same host perspective and voice, then review and edit every line of the script before generating audio.',
              image: '/screenshots/podcasts.png',
              color: 'text-violet-400',
              iconBg: 'bg-violet-500/10',
              reverse: true,
            },
            {
              icon: SpeakerLoudIcon,
              label: 'Voiceovers',
              headline:
                'From script to professional narration — fully reviewable',
              desc: 'Write or paste your script, let the built-in AI assistant refine it, pick from 30+ natural voices, and generate polished audio — perfect for compliant training, explainers, and presentations.',
              image: '/screenshots/voiceovers.png',
              color: 'text-emerald-400',
              iconBg: 'bg-emerald-500/10',
            },
            {
              icon: ImageIcon,
              label: 'Infographics',
              headline: 'Create on-brand visuals without a designer',
              desc: 'Describe what you need, choose a format and style preset, and get review-ready images. Save your brand styles so every visual stays consistent and on-message.',
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

      {/* Capabilities */}
      <section className="px-6 pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {[
            '30+ natural voices',
            'PDF, DOCX, URL import',
            '4 infographic formats',
            'AI deep research',
            'Full script review',
            'Source-grounded output',
          ].map((item, i, arr) => (
            <span key={item} className="flex items-center gap-4">
              {item}
              {i < arr.length - 1 && (
                <span aria-hidden="true" className="text-border">
                  ·
                </span>
              )}
            </span>
          ))}
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
