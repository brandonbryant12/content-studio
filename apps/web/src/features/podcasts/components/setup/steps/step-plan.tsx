import { MagicWandIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import type { EpisodePlanSourceSummary } from '../../episode-plan-editor';
import type { EpisodePlan } from '@/features/podcasts/lib/episode-plan';
import { EpisodePlanEditor } from '../../episode-plan-editor';

interface StepPlanProps {
  plan: EpisodePlan | null;
  setupInstructions: string;
  selectedSources: readonly (EpisodePlanSourceSummary & { status: string })[];
  canGeneratePlan: boolean;
  isGeneratingPlan: boolean;
  pendingSourceCount: number;
  onPlanChange: (plan: EpisodePlan) => void;
}

const plannerBenefits = [
  'A clearer opening hook',
  'A section-by-section episode arc',
  'Source coverage hints before scripting',
];

function getWaitingCopy(pendingSourceCount: number) {
  if (pendingSourceCount === 0) {
    return 'Generate a plan from your sources, then review it before the first script draft.';
  }

  return `${pendingSourceCount} selected source${pendingSourceCount === 1 ? ' is' : 's are'} still processing. You can still generate now. Once those sources are ready, we will build the episode plan in the background and continue into the draft.`;
}

function StepPlanHeader() {
  return (
    <div className="setup-step-header">
      <p className="setup-step-eyebrow">Step 4 of 4</p>
      <h2 className="setup-step-title">Episode Planner</h2>
      <p className="setup-step-description">
        Review the episode plan before scripting, or let Generate create it in
        the background.
      </p>
    </div>
  );
}

function PlannerSeed({ setupInstructions }: { setupInstructions: string }) {
  if (setupInstructions.trim().length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-border/60 bg-card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Planner Seed
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        {setupInstructions}
      </p>
    </div>
  );
}

function PlanStatusChip({
  canGeneratePlan,
  isGeneratingPlan,
}: {
  canGeneratePlan: boolean;
  isGeneratingPlan: boolean;
}) {
  if (isGeneratingPlan) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
        <Spinner className="h-3 w-3" />
        Generating plan...
      </span>
    );
  }

  if (canGeneratePlan) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Ready &mdash; use the button below
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
      <ReloadIcon className="h-3 w-3" />
      Waiting on sources
    </span>
  );
}

function EmptyPlanState({
  canGeneratePlan,
  isGeneratingPlan,
  pendingSourceCount,
}: {
  canGeneratePlan: boolean;
  isGeneratingPlan: boolean;
  pendingSourceCount: number;
}) {
  return (
    <div className="space-y-6">
      <div className="setup-ai-note">
        <div className="setup-ai-note-icon">
          <MagicWandIcon />
        </div>
        <div className="setup-ai-note-content">
          <p className="setup-ai-note-title">Plan your episode</p>
          <p className="setup-ai-note-description">
            Outline the hook, section arc, and closing takeaway before the
            script draft so you can steer the direction up front.
          </p>

          <div className="mt-3">
            <PlanStatusChip
              canGeneratePlan={canGeneratePlan}
              isGeneratingPlan={isGeneratingPlan}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <p className="text-sm font-semibold text-foreground">
            What the planner gives you
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {plannerBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <p className="text-sm font-semibold text-foreground">
            If you want to generate now
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {getWaitingCopy(pendingSourceCount)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StepPlan({
  plan,
  setupInstructions,
  selectedSources,
  canGeneratePlan,
  isGeneratingPlan,
  pendingSourceCount,
  onPlanChange,
}: StepPlanProps) {
  return (
    <div className="setup-content">
      <StepPlanHeader />
      <PlannerSeed setupInstructions={setupInstructions} />

      {plan ? (
        <EpisodePlanEditor
          plan={plan}
          sources={selectedSources}
          onPlanChange={onPlanChange}
          intro={
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Plan generated.
                </span>{' '}
                Review and edit below, then approve to start the script draft.
              </p>
            </div>
          }
        />
      ) : (
        <EmptyPlanState
          canGeneratePlan={canGeneratePlan}
          isGeneratingPlan={isGeneratingPlan}
          pendingSourceCount={pendingSourceCount}
        />
      )}
    </div>
  );
}
