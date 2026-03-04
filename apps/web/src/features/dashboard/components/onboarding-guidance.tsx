import {
  Cross2Icon,
  FileTextIcon,
  MixerHorizontalIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';

interface OnboardingGuidanceProps {
  onDismiss: () => void;
}

const steps = [
  {
    number: 1,
    title: 'Add source material',
    description:
      'Upload documents, paste URLs, or research topics to build your knowledge base.',
    linkTo: '/sources' as const,
    linkLabel: 'Go to Sources',
    icon: FileTextIcon,
    accentBg: 'bg-sky-500/10',
    accentText: 'text-sky-600 dark:text-sky-400',
    numberBg: 'bg-sky-500',
  },
  {
    number: 2,
    title: 'Set up your brand voice',
    description:
      'Create personas to define tone, style, and personality for your generated content.',
    linkTo: '/personas' as const,
    linkLabel: 'Go to Personas',
    icon: PersonIcon,
    accentBg: 'bg-violet-500/10',
    accentText: 'text-violet-600 dark:text-violet-400',
    numberBg: 'bg-violet-500',
  },
  {
    number: 3,
    title: 'Generate your first content',
    description:
      'Turn your sources into podcasts, voiceovers, or infographics with one click.',
    linkTo: '/podcasts' as const,
    linkLabel: 'Start Creating',
    icon: MixerHorizontalIcon,
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    numberBg: 'bg-emerald-500',
  },
] as const;

export function OnboardingGuidance({ onDismiss }: OnboardingGuidanceProps) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 sm:p-8 animate-fade-in-up stagger-2">
      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss onboarding guide"
      >
        <Cross2Icon className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="mb-6 sm:mb-8 max-w-lg">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
          Welcome to Content Studio
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Follow these three steps to create your first piece of content.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex flex-col rounded-xl border border-border/60 bg-background p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
          >
            {/* Step number + icon */}
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${step.numberBg} text-xs font-semibold text-white`}
              >
                {step.number}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${step.accentBg}`}
              >
                <step.icon className={`w-4 h-4 ${step.accentText}`} />
              </div>
            </div>

            {/* Content */}
            <h3 className="font-serif text-base font-semibold text-foreground mb-1.5">
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
              {step.description}
            </p>

            {/* CTA */}
            <Link to={step.linkTo}>
              <Button variant="outline" size="sm" className="w-full text-xs">
                {step.linkLabel}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
