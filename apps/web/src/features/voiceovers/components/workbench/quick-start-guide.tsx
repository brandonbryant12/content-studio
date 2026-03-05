import {
  SpeakerLoudIcon,
  Pencil1Icon,
  ChatBubbleIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';

interface QuickStartGuideProps {
  onStartWriting: () => void;
  onDismiss: () => void;
}

const steps = [
  {
    number: 1,
    title: 'Choose a Voice',
    description:
      'Select a character from the ensemble above to narrate your script.',
    icon: SpeakerLoudIcon,
    accentBg: 'bg-violet-500/10',
    accentText: 'text-violet-600 dark:text-violet-400',
    numberBg: 'bg-violet-500',
  },
  {
    number: 2,
    title: 'Write Your Script',
    description:
      'Type or paste the words you want brought to life. The manuscript awaits.',
    icon: Pencil1Icon,
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-600 dark:text-amber-400',
    numberBg: 'bg-amber-500',
    isPrimary: true,
  },
  {
    number: 3,
    title: 'Try the Writing Assistant',
    description:
      'Open the side panel for AI help generating better phrasing, stronger hooks, and cleaner pacing.',
    icon: ChatBubbleIcon,
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    numberBg: 'bg-emerald-500',
  },
] as const;

export function QuickStartGuide({
  onStartWriting,
  onDismiss,
}: QuickStartGuideProps) {
  return (
    <div className="flex items-center justify-center h-full animate-fade-in-up">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="font-serif text-xl font-semibold text-foreground mb-1.5">
            Your stage is set
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Three steps to your first voiceover performance.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

              {/* CTA for primary step */}
              {'isPrimary' in step && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-xs"
                  onClick={onStartWriting}
                >
                  Start Writing
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Skip */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm px-2 py-1"
          >
            Skip this guide
          </button>
        </div>
      </div>
    </div>
  );
}
