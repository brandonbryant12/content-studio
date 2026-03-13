import { ChevronDownIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Input } from '@repo/ui/components/input';
import { useCallback, useState, type ReactNode } from 'react';
import {
  createEmptyEpisodePlanSection,
  type EpisodePlan,
} from '../lib/episode-plan';

export interface EpisodePlanSourceSummary {
  id: string;
  title: string;
}

type EpisodePlanSection = EpisodePlan['sections'][number];

interface EpisodePlanEditorProps {
  plan: EpisodePlan;
  sources: readonly EpisodePlanSourceSummary[];
  onPlanChange: (plan: EpisodePlan) => void;
  disabled?: boolean;
  intro?: ReactNode;
}

function SourceChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs text-warning"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function PlanSectionCard({
  plan,
  section,
  index,
  isExpanded,
  sourceLabels,
  disabled,
  onToggle,
  onPlanChange,
}: {
  plan: EpisodePlan;
  section: EpisodePlanSection;
  index: number;
  isExpanded: boolean;
  sourceLabels: string[];
  disabled?: boolean;
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
    <div className="plan-section-card">
      <button
        type="button"
        onClick={() => onToggle(index)}
        className="plan-section-toggle"
        aria-expanded={isExpanded}
        aria-label={`Toggle section ${index + 1}`}
        disabled={disabled}
      >
        <span className="plan-section-number">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {section.heading || 'Untitled section'}
          </p>
        </div>
        {typeof section.estimatedMinutes === 'number' && (
          <span className="plan-section-duration">
            ~{section.estimatedMinutes} min
          </span>
        )}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="plan-section-body">
          <div className="plan-field">
            <label className="plan-field-label">Heading</label>
            <Input
              value={section.heading}
              onChange={(event) =>
                updateSection((currentSection) => ({
                  ...currentSection,
                  heading: event.target.value,
                }))
              }
              className="plan-field-input"
              aria-label={`Section ${index + 1} heading`}
              disabled={disabled}
            />
          </div>

          <div className="plan-field">
            <label className="plan-field-label">Summary</label>
            <textarea
              value={section.summary}
              onChange={(event) =>
                updateSection((currentSection) => ({
                  ...currentSection,
                  summary: event.target.value,
                }))
              }
              rows={2}
              className="plan-field-textarea"
              aria-label={`Section ${index + 1} summary`}
              disabled={disabled}
            />
          </div>

          <div className="plan-field">
            <label className="plan-field-label">Key points</label>
            <textarea
              value={section.keyPoints.join('\n')}
              onChange={(event) =>
                updateSection((currentSection) => ({
                  ...currentSection,
                  keyPoints: event.target.value.split('\n'),
                }))
              }
              rows={2}
              className="plan-field-textarea"
              aria-label={`Section ${index + 1} key points`}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground/70">One per line</p>
          </div>

          <SourceChips labels={sourceLabels} />

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={removeSection}
              disabled={disabled || plan.sections.length === 1}
              className="plan-section-remove"
              aria-label={`Remove section ${index + 1}`}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EpisodePlanEditor({
  plan,
  sources,
  onPlanChange,
  disabled,
  intro,
}: EpisodePlanEditorProps) {
  const sourceTitleMap = new Map(
    sources.map((source) => [source.id, source.title]),
  );
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    () => new Set([0]),
  );
  const [overviewExpanded, setOverviewExpanded] = useState(false);

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
    <div className="space-y-4">
      {intro}

      {/* Episode overview — collapsible to reduce noise */}
      <div className="plan-section-card">
        <button
          type="button"
          onClick={() => setOverviewExpanded((prev) => !prev)}
          className="plan-section-toggle"
          aria-expanded={overviewExpanded}
          aria-label="Toggle episode overview"
          disabled={disabled}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Episode Overview
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            Angle, hook &amp; takeaway
          </span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${overviewExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {overviewExpanded && (
          <div className="plan-section-body">
            <div className="plan-field">
              <label className="plan-field-label">Editorial angle</label>
              <textarea
                value={plan.angle}
                onChange={(event) =>
                  updatePlanField('angle', event.target.value)
                }
                rows={2}
                className="plan-field-textarea"
                aria-label="Episode plan angle"
                disabled={disabled}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="plan-field">
                <label className="plan-field-label">Opening hook</label>
                <textarea
                  value={plan.openingHook}
                  onChange={(event) =>
                    updatePlanField('openingHook', event.target.value)
                  }
                  rows={3}
                  className="plan-field-textarea"
                  aria-label="Episode plan opening hook"
                  disabled={disabled}
                />
              </div>

              <div className="plan-field">
                <label className="plan-field-label">Closing takeaway</label>
                <textarea
                  value={plan.closingTakeaway}
                  onChange={(event) =>
                    updatePlanField('closingTakeaway', event.target.value)
                  }
                  rows={3}
                  className="plan-field-textarea"
                  aria-label="Episode plan closing takeaway"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section cards */}
      <div className="space-y-2">
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
              disabled={disabled}
              onToggle={toggleSection}
              onPlanChange={onPlanChange}
            />
          );
        })}

        <button
          type="button"
          onClick={addSection}
          disabled={disabled}
          className="plan-add-section"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add Section
        </button>
      </div>
    </div>
  );
}
