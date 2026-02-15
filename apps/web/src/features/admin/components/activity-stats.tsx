import {
  FileTextIcon,
  ImageIcon,
  LightningBoltIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import type { Period, StatBreakdown } from '../types';
import type { ComponentType } from 'react';

interface ActivityStatsProps {
  total: number;
  byEntityType: readonly StatBreakdown[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  isLoading: boolean;
}

const ENTITY_CONFIG: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
    label: string;
  }
> = {
  document: {
    icon: FileTextIcon,
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-600 dark:text-sky-400',
    label: 'Documents',
  },
  podcast: {
    icon: MixerHorizontalIcon,
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-600 dark:text-violet-400',
    label: 'Podcasts',
  },
  voiceover: {
    icon: SpeakerLoudIcon,
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'Voiceovers',
  },
  infographic: {
    icon: ImageIcon,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
    label: 'Infographics',
  },
};

const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

export function ActivityStats({
  total,
  byEntityType,
  period,
  onPeriodChange,
  isLoading,
}: ActivityStatsProps) {
  const entityCounts = Object.fromEntries(
    byEntityType.map((e) => [e.field, e.count]),
  );

  return (
    <div>
      {/* Period selector */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Activity Overview
        </h2>
        <div className="flex gap-1" role="tablist" aria-label="Time period">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="content-grid-4 mb-6">
        {/* Total */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Activities</span>
            <div className="stat-card-icon bg-primary/10">
              <LightningBoltIcon className="text-primary" aria-hidden="true" />
            </div>
          </div>
          <span className="stat-card-value">
            {isLoading ? (
              <Spinner className="w-5 h-5" />
            ) : (
              total.toLocaleString()
            )}
          </span>
        </div>

        {renderEntityCard('document', entityCounts, isLoading)}
        {renderEntityCard('podcast', entityCounts, isLoading)}
        {renderEntityCard('voiceover', entityCounts, isLoading)}
      </div>
    </div>
  );
}

function renderEntityCard(
  entityType: string,
  entityCounts: Record<string, number>,
  isLoading: boolean,
) {
  const config = ENTITY_CONFIG[entityType];
  if (!config) return null;
  const Icon = config.icon;
  const count = entityCounts[entityType] ?? 0;

  return (
    <div key={entityType} className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-label">{config.label}</span>
        <div className={`stat-card-icon ${config.bgColor}`}>
          <Icon className={config.textColor} aria-hidden="true" />
        </div>
      </div>
      <span className="stat-card-value">
        {isLoading ? <Spinner className="w-5 h-5" /> : count.toLocaleString()}
      </span>
    </div>
  );
}
