import {
  ArrowRightIcon,
  FileTextIcon,
  ImageIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { authClient } from '@/clients/authClient';
import { APP_NAME } from '@/constants';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function WaveformBars() {
  return (
    <div className="flex items-end gap-[3px] h-16" aria-hidden="true">
      {[
        0.4, 0.7, 1, 0.6, 0.85, 0.45, 0.95, 0.5, 0.75, 0.35, 0.9, 0.55, 0.8,
        0.4, 0.65,
      ].map((height, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-primary/60 animate-[waveform_1.8s_ease-in-out_infinite_alternate]"
          style={{
            height: `${height * 100}%`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

function RouteComponent() {
  const { data: session } = authClient.useSession();

  if (session?.user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex flex-col bg-background overflow-hidden">
      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-6 py-20 md:py-28">
        {/* Background orbs */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[100px] pointer-events-none"
          style={{ background: 'hsl(238 70% 58%)' }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[80px] pointer-events-none"
          style={{ background: 'hsl(330 65% 55%)' }}
          aria-hidden="true"
        />
        <div
          className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full opacity-[0.04] blur-[60px] pointer-events-none"
          style={{ background: 'hsl(160 60% 45%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl mx-auto w-full text-center">
          {/* Waveform accent */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <WaveformBars />
          </div>

          {/* Eyebrow */}
          <p className="page-eyebrow animate-fade-in-up">
            Create. Transform. Publish.
          </p>

          {/* Headline */}
          <h1
            className="font-serif font-bold tracking-tight text-foreground leading-[1.05] animate-fade-in-up stagger-1"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontVariationSettings: "'SOFT' 50, 'WONK' 1",
            }}
          >
            Your documents, <span className="text-primary">reimagined</span> as
            audio
          </h1>

          {/* Subtitle */}
          <p className="text-body-lg mt-6 max-w-xl mx-auto animate-fade-in-up stagger-2">
            Upload documents and transform them into podcasts, voiceovers, and
            infographics — all from one studio.
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
        <div className="content-grid-4 max-w-4xl mx-auto">
          {[
            {
              icon: FileTextIcon,
              label: 'Documents',
              desc: 'Upload PDFs, DOCX, and text files as source material',
              color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
              delay: 'stagger-3',
            },
            {
              icon: MixerHorizontalIcon,
              label: 'Podcasts',
              desc: 'Generate multi-voice conversational audio content',
              color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
              delay: 'stagger-4',
            },
            {
              icon: SpeakerLoudIcon,
              label: 'Voiceovers',
              desc: 'Create narrated audio with natural-sounding voices',
              color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              delay: 'stagger-5',
            },
            {
              icon: ImageIcon,
              label: 'Infographics',
              desc: 'Design visual summaries from your content',
              color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              delay: 'stagger-6',
            },
          ].map(({ icon: Icon, label, desc, color, delay }) => (
            <div
              key={label}
              className={`card-padded flex flex-col items-center text-center gap-3 animate-fade-in-up ${delay}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-serif font-semibold text-foreground">
                {label}
              </h3>
              <p className="text-body">{desc}</p>
            </div>
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
