import {
  ChevronDownIcon,
  MagicWandIcon,
  PlusIcon,
  ReloadIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useCallback, useState } from 'react';
import {
  createEmptyEpisodePlanSection,
  type EpisodePlan,
} from '@/features/podcasts/lib/episode-plan';

interface SelectedSourceSummary {
  id: string;
  title: string;
  status: string;
}

interface StepPlanProps {
  plan: EpisodePlan | null;
  setupInstructions: string;
  selectedSources: readonly SelectedSourceSummary[];
  canGeneratePlan: boolean;
  isGeneratingPlan: boolean;
  pendingSourceCount: number;
  onPlanChange: (plan: EpisodePlan) => void;
}

type EpisodePlanSection = EpisodePlan['sections'][number];

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

function SourceChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border/50 pt-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2.5 py-0.5 text-xs text-warning"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanSectionCard({
  plan,
  section,
  index,
  isExpanded,
  sourceLabels,
  onToggle,
  onPlanChange,
}: {
  plan: EpisodePlan;
  section: EpisodePlanSection;
  index: number;
  isExpanded: boolean;
  sourceLabels: string[];
  onToggle: (index: number) => void;
  onPlanChange: (plan: EpisodePlan) => void;
}) {
  const updateSection = useCallback(
    (recipe: (currentSection: EpisodePlanSection) => EpisodePlanSection) => {
      onPlanChange({
        ...plan,
        sections: plan.sections.map((currentSection, sectionIndex) =>
          sectionIndex === index ? recipe(currentSection) : currentSection,
        ),
      });
    },
    [index, onPlanChange, plan],
  );

  const removeSection = useCallback(() => {
    onPlanChange({
      ...plan,
      sections: plan.sections.filter(
        (_currentSection, sectionIndex) => sectionIndex !== index,
      ),
    });
  }, [index, onPlanChange, plan]);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => onToggle(index)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={isExpanded}
          aria-label={`Toggle section ${index + 1}`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/15 text-xs font-bold text-warning">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {section.heading || 'Untitled section'}
            </p>
            {typeof section.estimatedMinutes === 'number' && (
              <p className="text-xs text-muted-foreground">
                ~{section.estimatedMinutes} min
              </p>
            )}
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={removeSection}
          disabled={plan.sections.length === 1}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
          aria-label={`Remove section ${index + 1}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 border-t border-border/50 px-4 pb-5 pt-4">
          <div className="setup-field">
            <label className="setup-label">Heading</label>
            <Input
              value={section.heading}
              onChange={(event) =>
                updateSection((currentSection) => ({
                  ...currentSection,
                  heading: event.target.value,
                }))
              }
              aria-label={`Section ${index + 1} heading`}
            />
          </div>

          <div className="setup-field">
            <label className="setup-label">Summary</label>
            <textarea
              value={section.summary}
              onChange={(event) =>
                updateSection((currentSection) => ({
                  ...currentSection,
                  summary: event.target.value,
                }))
              }
              rows={3}
              className="setup-textarea"
              aria-label={`Section ${index + 1} summary`}
            />
          </div>

          <div className="setup-field">
            <label className="setup-label">Key points</label>
            <textarea
              value={section.keyPoints.join('\n')}
              onChange={(event) =>
                updateSection((currentSection) => ({
                  ...currentSection,
                  keyPoints: event.target.value.split('\n'),
                }))
              }
              rows={3}
              className="setup-textarea"
              aria-label={`Section ${index + 1} key points`}
            />
            <p className="setup-hint">One point per line</p>
          </div>

          <SourceChips labels={sourceLabels} />
        </div>
      )}
    </div>
  );
}

function PlanEditor({
  plan,
  selectedSources,
  onPlanChange,
}: {
  plan: EpisodePlan;
  selectedSources: readonly SelectedSourceSummary[];
  onPlanChange: (plan: EpisodePlan) => void;
}) {
  const sourceTitleMap = new Map(
    selectedSources.map((source) => [source.id, source.title]),
  );
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    () => new Set(plan.sections.map((_, index) => index)),
  );

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const updatePlanField = useCallback(
    (field: 'angle' | 'openingHook' | 'closingTakeaway', value: string) => {
      onPlanChange({
        ...plan,
        [field]: value,
      });
    },
    [onPlanChange, plan],
  );

  const addSection = useCallback(() => {
    const newIndex = plan.sections.length;
    onPlanChange({
      ...plan,
      sections: [...plan.sections, createEmptyEpisodePlanSection()],
    });
    setExpandedSections((prev) => new Set([...prev, newIndex]));
  }, [onPlanChange, plan]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Plan generated.</span>{' '}
          Review and edit below, then approve to start the script draft.
        </p>
      </div>

      <div className="setup-field">
        <label className="setup-label">Editorial angle</label>
        <textarea
          value={plan.angle}
          onChange={(event) => updatePlanField('angle', event.target.value)}
          rows={3}
          className="setup-textarea"
          aria-label="Episode plan angle"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="setup-field">
          <label className="setup-label">Opening hook</label>
          <textarea
            value={plan.openingHook}
            onChange={(event) =>
              updatePlanField('openingHook', event.target.value)
            }
            rows={4}
            className="setup-textarea"
            aria-label="Episode plan opening hook"
          />
        </div>

        <div className="setup-field">
          <label className="setup-label">Closing takeaway</label>
          <textarea
            value={plan.closingTakeaway}
            onChange={(event) =>
              updatePlanField('closingTakeaway', event.target.value)
            }
            rows={4}
            className="setup-textarea"
            aria-label="Episode plan closing takeaway"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sections</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Edit the sequence the script should follow.
          </p>
        </div>

        {plan.sections.map((section, index) => {
          const sourceLabels = section.sourceIds
            .map((sourceId) => sourceTitleMap.get(sourceId) ?? sourceId)
            .filter(Boolean);

          return (
            <PlanSectionCard
              key={`${section.heading}-${index}`}
              plan={plan}
              section={section}
              index={index}
              isExpanded={expandedSections.has(index)}
              sourceLabels={sourceLabels}
              onToggle={toggleSection}
              onPlanChange={onPlanChange}
            />
          );
        })}

        <button
          type="button"
          onClick={addSection}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-warning/40 hover:bg-warning/5 hover:text-foreground"
        >
          <PlusIcon className="h-4 w-4" />
          Add section
        </button>
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
        <PlanEditor
          plan={plan}
          selectedSources={selectedSources}
          onPlanChange={onPlanChange}
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
